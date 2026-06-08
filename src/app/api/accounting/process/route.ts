import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';
import * as cheerio from 'cheerio';
import * as officeCrypto from 'office-crypto';
import mysql from 'mysql2/promise';

function numOnly(txt: any): number {
  if (txt === null || txt === undefined) return 0;
  let str = String(txt).replace(/[^0-9.-]/g, '');
  if (str.includes('-') && str.indexOf('-') !== 0) str = str.replace('-', '');
  if (str.replace(/[^0-9]/g, '') === '') return 0;
  if (str === '' || str === '-') return 0;
  return Number(str.replace(/,/g, ''));
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const passwordsStr = formData.get('passwords') as string;
    const passwords = passwordsStr ? JSON.parse(passwordsStr) : { dongmin: '', hyunjoo: '' };

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // 1. Load Categories
    const { data: categories, error: catError } = await supabase.from('categories').select('*');
    if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);

    const getCategory = (merchantName: string) => {
      return categories?.find(c => merchantName.includes(c.merchant)) || null;
    };

    // 2. Connect to MySQL (store)
    let sellDf: any[] = [];
    let itemDf: any[] = [];
    let stockDf: any[] = [];
    
    try {
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'root',
        database: process.env.MYSQL_DB || 'store'
      });

      const [sellRows] = await conn.execute('SELECT 구매일, 구매합계, 상품코드, 사업자, 스토어, 주문번호 FROM 주문리스트');
      const [itemRows] = await conn.execute('SELECT 상품코드, 구분 FROM 상품리스트');
      const [stockRows] = await conn.execute('SELECT 날짜, 구매처, 금액, 사업자 FROM 재고내역');
      
      sellDf = (sellRows as any[]).map(row => ({
        ...row,
        구매일: String(row.구매일).split(' ')[0], // Date object to YYYY-MM-DD
        구매합계_num: numOnly(row.구매합계)
      }));
      itemDf = itemRows as any[];
      stockDf = stockRows as any[];
      
      await conn.end();
    } catch (dbError: any) {
      console.warn("MySQL Connection Failed, proceeding without business expense matching:", dbError.message);
    }

    const matchBusinessExpense = (dateStr: string, amountNum: number) => {
      let res = { 소비분류: '국내구매', 사업자: '', 매출처: '', 주문번호: '', matched: false };
      const matches = sellDf.filter(o => o.구매일 === dateStr && o.구매합계_num === Math.abs(amountNum));
      if (matches.length > 0) {
        res.matched = true;
        const order = matches[0];
        const code = String(order.상품코드).split('C')[0];
        if (code) {
          const item = itemDf.find(i => String(i.상품코드) === code);
          if (item && item.구분 === '해외') {
            res.소비분류 = '해외구매';
          }
        }
        res.사업자 = String(order.사업자 || '');
        res.매출처 = String(order.스토어 || '');
        res.주문번호 = String(order.주문번호 || '');
      }
      return res;
    };

    const applyBusinessAndCoupangLogic = (결제일: string, 지출내용: string, 지출금액: number, cat: any) => {
      let 소비분류 = cat ? cat.category : '';
      let 사업자 = '', 매출처 = '', 주문번호 = '';
      let isCoupangMatchedInSellDf = false;

      if (소비분류 === '사업지출' || 소비분류 === '국내구매') {
        const matched = matchBusinessExpense(결제일, 지출금액);
        if (matched.matched) {
          소비분류 = matched.소비분류; 
          사업자 = matched.사업자; 
          매출처 = matched.매출처; 
          주문번호 = matched.주문번호;
          if (cat && (cat.merchant === '쿠팡' || 지출내용.includes('쿠팡'))) {
            isCoupangMatchedInSellDf = true;
          }
        } else if (소비분류 === '사업지출') {
          소비분류 = '국내구매';
        }
      }

      const isCoupangMerchant = 지출내용 === '쿠팡' || 지출내용.includes('쿠팡');

      if (isCoupangMerchant && !isCoupangMatchedInSellDf) {
        const stockMatched = stockDf.find(s => String(s.날짜) === 결제일 && String(s.구매처) === '쿠팡' && numOnly(s.금액) === Math.abs(지출금액));
        if (stockMatched) {
          소비분류 = '국내구매';
          사업자 = String(stockMatched.사업자);
          매출처 = '';
          주문번호 = '';
        } else {
          소비분류 = ''; // 미분류 처리
          사업자 = '';
          매출처 = '';
          주문번호 = '';
        }
      }

      return { 소비분류, 사업자, 매출처, 주문번호 };
    };

    const transactions: any[] = [];

    // 3. Process Files
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        if (fileName.includes('kb') || fileName.includes('국민')) {
          const wb = xlsx.read(buffer, { type: 'buffer' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const data: any[] = xlsx.utils.sheet_to_json(sheet, { range: 5, defval: '' });

          for (const row of data) {
            const 지출금액 = numOnly(row['이용금액']);
            if (지출금액 === 0) continue;
            
            const 결제일 = String(row['이용일']).trim();
            const 지출내용 = String(row['이용하신곳']).trim();
            const 결제수단 = '동민_' + (String(row['카드번호']).includes('2081') ? 'KB가온' : 'KB올쇼핑');
            const 비고 = '';
            
            const cat = getCategory(지출내용);
            const { 소비분류, 사업자, 매출처, 주문번호 } = applyBusinessAndCoupangLogic(결제일, 지출내용, 지출금액, cat);

            transactions.push({ 거래일: 결제일, 지출내용, 지출금액, 소비분류, 매출처, 주문번호, 결제수단, 사업자, 비고 });
          }
        }
        
        else if (fileName.includes('현대')) {
          const owner = fileName.includes('동민') ? '동민' : '현주';
          const htmlText = buffer.toString('utf-8');
          const $ = cheerio.load(htmlText);
          const rows = $('tr');
          
          if (rows.length > 3) {
            const headers = $(rows[2]).find('th').map((_, el) => $(el).text().trim()).get();
            for (let i = 3; i < rows.length - 1; i++) {
              const tds = $(rows[i]).find('td').map((_, el) => $(el).text().trim()).get();
              if (tds.length === headers.length) {
                const rowObj: any = {};
                headers.forEach((h, idx) => rowObj[h] = tds[idx]);

                const 지출금액 = numOnly(rowObj['이용금액']);
                if (지출금액 === 0) continue;

                let 결제일 = String(rowObj['이용일']).replace(/\./g, '-');
                const rawDate = String(rowObj['이용일']).split(' ');
                if (rawDate.length >= 3) {
                  결제일 = `${numOnly(rawDate[0])}-${String(numOnly(rawDate[1])).padStart(2, '0')}-${String(numOnly(rawDate[2])).padStart(2, '0')}`;
                }

                const 지출내용 = String(rowObj['가맹점명']).trim();
                const 결제수단 = `${owner}_${rowObj['카드명(카드번호 뒤 4자리)'] || '현대'}`;
                const 비고 = '';

                const cat = getCategory(지출내용);
                const { 소비분류, 사업자, 매출처, 주문번호 } = applyBusinessAndCoupangLogic(결제일, 지출내용, 지출금액, cat);

                transactions.push({ 거래일: 결제일, 지출내용, 지출금액, 소비분류, 매출처, 주문번호, 결제수단, 사업자, 비고 });
              }
            }
          }
        }

        else if (fileName.includes('신한')) {
          const owner = fileName.includes('동민') ? '동민' : '현주';
          const wb = xlsx.read(buffer, { type: 'buffer' });
          const data: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 4, defval: '' });

          for (let i = 0; i < data.length - 2; i++) {
            const row = data[i];
            const 지출금액 = numOnly(row['이용금액']);
            if (지출금액 === 0) continue;

            const 결제일 = String(row['거래일']).replace(/\./g, '-');
            const 지출내용 = String(row['가맹점명']).trim();
            const cardNum = numOnly(row['이용카드\n(뒤4자리)']);
            const 비고 = '';
            
            let cardName = '신한';
            if (owner === '동민') {
              if (cardNum === 769) cardName = '신한네이버';
              else if (cardNum === 82) cardName = '신한11번가';
              else if (cardNum === 280) cardName = '신한쿠팡';
            } else {
              if (cardNum === 816) cardName = '신한네이버';
              else if (cardNum === 28) cardName = '신한11번가';
              else if (cardNum === 1089) cardName = '신한쿠팡';
            }
            const 결제수단 = `${owner}_${cardName}`;

            const cat = getCategory(지출내용);
            const { 소비분류, 사업자, 매출처, 주문번호 } = applyBusinessAndCoupangLogic(결제일, 지출내용, 지출금액, cat);

            transactions.push({ 거래일: 결제일, 지출내용, 지출금액, 소비분류, 매출처, 주문번호, 결제수단, 사업자, 비고 });
          }
        }

        else if (fileName.includes('우리')) {
          const owner = fileName.includes('동민') ? '동민' : '현주';
          const isMatong = fileName.includes('마통');
          const wb = xlsx.read(buffer, { type: 'buffer' });
          const data: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 3, defval: '' });

          for (const row of data) {
            const 출금금액 = numOnly(row['찾으신금액']);
            const 입금금액 = numOnly(row['맡기신금액']);
            if (출금금액 === 0 && 입금금액 === 0) continue;

            const 기재내용 = String(row['기재내용']).trim();
            const 적요 = String(row['적요']).trim();

            if (기재내용.includes('쿠팡') && (적요 === '체크신한' || 적요 === '오픈뱅킹')) continue;

            const 결제일 = String(row['거래일시']).split(' ')[0].replace(/\./g, '-');
            const 결제수단 = `${owner}_${isMatong ? '마통' : '우리'}`;

            const cat = getCategory(기재내용);
            let 비고 = '';

            if (출금금액 > 0) {
              비고 = '출금';
              const { 소비분류, 사업자, 매출처, 주문번호 } = applyBusinessAndCoupangLogic(결제일, 기재내용, 출금금액, cat);
              transactions.push({ 거래일: 결제일, 지출내용: 기재내용, 지출금액: 출금금액, 소비분류, 매출처, 주문번호, 결제수단, 사업자, 비고 });
            } else {
              비고 = '입금';
              let 소비분류 = cat ? cat.category : '';
              let 사업자 = '';
              if (cat && cat.category === '사업지출') {
                소비분류 = '사업소득';
                사업자 = owner === '현주' ? '더엠제이' : '동주';
              }
              transactions.push({ 거래일: 결제일, 지출내용: 기재내용, 지출금액: 입금금액, 소비분류, 매출처: '', 주문번호: '', 결제수단, 사업자, 비고 });
            }
          }
        }

        else if (fileName.includes('하나')) {
          const owner = '현주';
          const wb = xlsx.read(buffer, { type: 'buffer' });
          const data: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 5, defval: '' });

          for (const row of data) {
            const 출금액 = numOnly(row['출금액']);
            const 입금액 = numOnly(row['입금액']);
            const 거래일시 = String(row['거래일시']).trim();
            
            if ((출금액 === 0 && 입금액 === 0) || 거래일시 === '') continue;

            const 결제일 = 거래일시.split(' ')[0].replace(/\./g, '-');
            const 지출내용 = String(row['적요']).trim();
            const 결제수단 = `${owner}_하나`;

            const cat = getCategory(지출내용);
            let 비고 = '';

            if (출금액 > 0) {
              비고 = '출금';
              const { 소비분류, 사업자, 매출처, 주문번호 } = applyBusinessAndCoupangLogic(결제일, 지출내용, 출금액, cat);
              transactions.push({ 거래일: 결제일, 지출내용, 지출금액: 출금액, 소비분류, 매출처, 주문번호, 결제수단, 사업자, 비고 });
            } else {
              비고 = '입금';
              let 소비분류 = cat ? cat.category : '';
              let 사업자 = '';
              if (cat && cat.category === '사업지출') {
                소비분류 = '사업소득';
                사업자 = '더엠제이';
              }
              transactions.push({ 거래일: 결제일, 지출내용, 지출금액: 입금액, 소비분류, 매출처: '', 주문번호: '', 결제수단, 사업자, 비고 });
            }
          }
        }

        else if (fileName.includes('토스')) {
          const owner = fileName.includes('동민') ? '동민' : '현주';
          const pw = owner === '동민' ? passwords.dongmin : passwords.hyunjoo;

          // Decrypt Toss Bank Excel
          let decryptedBuffer = buffer;
          if (officeCrypto.isEncrypted(buffer)) {
             const file = officeCrypto.OfficeFile(buffer);
             file.loadKey({ password: String(pw) });
             decryptedBuffer = Buffer.from(file.decrypt());
          }

          const wb = xlsx.read(decryptedBuffer, { type: 'buffer' });
          const data: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 8, defval: '' });

          for (const row of data) {
            const 금액 = numOnly(row['거래 금액']);
            if (금액 === 0) continue;

            const 결제일 = String(row['거래 일시']).split(' ')[0].replace(/\./g, '-');
            const 지출내용 = String(row['적요']).trim();
            const 결제수단 = `${owner}_토스`;

            const cat = getCategory(지출내용);
            let 비고 = '';

            if (금액 < 0) {
              비고 = '출금';
              const 출금액 = Math.abs(금액);
              const { 소비분류, 사업자, 매출처, 주문번호 } = applyBusinessAndCoupangLogic(결제일, 지출내용, 출금액, cat);
              transactions.push({ 거래일: 결제일, 지출내용, 지출금액: 출금액, 소비분류, 매출처, 주문번호, 결제수단, 사업자, 비고 });
            } else {
              비고 = '입금';
              let 소비분류 = cat ? cat.category : '';
              let 사업자 = '';
              if (cat && cat.category === '사업지출') {
                소비분류 = '사업소득';
                사업자 = owner === '동민' ? '동주' : '더엠제이';
              }
              transactions.push({ 거래일: 결제일, 지출내용, 지출금액: 금액, 소비분류, 매출처: '', 주문번호: '', 결제수단, 사업자, 비고 });
            }
          }
        }

      } catch (err: any) {
        console.error(`Error parsing file ${fileName}:`, err);
        transactions.push({
          거래일: 'ERROR', 지출내용: `[${fileName}] 파싱 에러`, 지출금액: 0,
          소비분류: '에러', 매출처: '', 주문번호: '', 결제수단: '', 사업자: '', 비고: err.message
        });
      }
    }

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Accounting Process API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
