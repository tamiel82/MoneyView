# MoneyView (자산 및 가계부 통합 관리 시스템)

## 1. 프로젝트 개요 (Overview)
- **한 줄 목적**: 개인 및 가구의 금융 계좌(주식, 코인, 절세계좌, 예수금) 자산과 가계부 수입/지출을 실시간 통합 관리하는 대시보드.
- **배포/실행 환경**: Production 배포 `https://moneyview.tamiel.org` (Vercel), Local Dev `http://localhost:3000`.
- **핵심 기술 스택**: 
  - **Framework/Language**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
  - **Database & Storage**: Supabase (PostgreSQL), Google Sheets API (Legacy/Historical Sync).
  - **External API/Library**: Yahoo Finance API (`yahoo-finance2`), `lucide-react`, `xlsx` (Excel 파싱).

## 2. 핵심 아키텍처 및 데이터 흐름 (Architecture)
- **데이터 저장 방식 (하이브리드)**:
  - **가계부(Transactions) & 주요 5개 계좌 보유자산(Holdings)**: Supabase DB (`transactions`, `holdings`, `accounts`)에 직접 저장 및 수정.
  - **구글 시트 연동**: 구글 시트(`자산배분현황`, `포트폴리오`, `월별평가액`) 배치 연동 및 과거 자산 내역 백업/조회.
- **주요 디렉토리 구조 및 핵심 파일**:
  ```text
  ├── src/
  │   ├── app/
  │   │   ├── accounts/page.tsx        # 자산/계좌 관리 페이지 (계좌별 보유자산, 예수금, 평가액)
  │   │   ├── accounting/page.tsx      # 가계부 트랜잭션 관리 페이지 (수입/지출/사업자 미매칭)
  │   │   ├── accounting/ledger/       # 연도별/월별 장부 결산 페이지
  │   │   └── api/                     # Supabase & Google Sheets & Yahoo Finance backend APIs
  │   ├── components/
  │   │   ├── dashboard/               # HoldingsViewer, AssetStatusViewer 등 핵심 대시보드 컴포넌트
  │   │   └── accounting/              # 카드 이용내역 Excel 업로드 및 트랜잭션 모달
  │   └── lib/                         # supabase.ts (Client/Service), googleSheets.ts, yahooFinance.ts
  ```
- **핵심 규칙 및 제약사항**:
  - **Supabase DB Account Mapping**: 계좌 ID는 Canonical Name(`현주주식`, `동민주식`, `현주절세`, `동민절세`, `동민코인`) 및 DB `account_id` (1~5)로 매핑하여 관리.
  - **달러/USDT 예수금 로직**: USD/USDT 자산은 원달러 환율이 아닌 수량 1.0(가치 $1) 기준으로 USD 평가액을 계산한 후 환율을 적용함.
  - **DB 정렬 및 페이징**: Supabase 트랜잭션/결산 조회 API 호출 시 페이지네이션 비결정성을 방지하기 위해 반드시 `.order('id')` 또는 `.order('date')` 명시.
  - **우리카드 Excel 파싱 규칙**: 국내/해외 카드 이용내역 파일 형식 자동 감지 및 날짜/매출전표 기준 중복 제거/수수료 합산.

## 3. 환경 변수 및 설정 체크리스트 (.env)
- **필요 환경변수 목록**:
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Client Anonymous Key
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Server-side Service Role Secret Key
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: 구글 서비스 계정 이메일
  - `GOOGLE_PRIVATE_KEY`: 구글 서비스 계정 비공개 키 (PEM format)
  - `GOOGLE_SHEETS_ID`: 연동 대상 Google Spreadsheet ID
- **실행 및 빌드 명령어**:
  - Dev 실행: `npm run dev`
  - Production 빌드: `npm run build`
  - Lint 검사: `npm run lint`

## 4. 현재 완료된 기능 (Current Status)
- [x] Supabase 기반 5개 핵심 계좌(`현주주식`, `동민주식`, `현주절세`, `동민절세`, `동민코인`) 자산/예수금 CUD 및 실시간 시세 반영
- [x] 달러 예수금 및 USDT(1USDT = $1) 가치 기반 평가액 정확도 개편
- [x] 가계부 내역 업로드 (우리카드 및 롯데카드 등 국내/해외 Excel/HTML 양식 자동 인식 파싱 및 수수료/원화 변환 처리)
- [x] 가계부 사업소득/사업지출 결산 연동 및 사업자 미매칭 항목 필터링 (분류가 "사업소득"인 미매칭 건 포함)
- [x] 연도별/월별 결산 페이지 pagination 비결정성 버그 수정 (`.order('id')` 적용) 및 DB/시트 수치 동기화
- [x] Yahoo Finance API 연동을 통한 주식/암호화폐/원달러 환율 실시간 자동 업데이트

## 5. 다음 작업 목표 및 과제 (Next Tasks)
- [ ] 전체 계좌 자산 보유 내역의 Google Sheets - Supabase DB 완전 자동 동기화 워커 구축
- [ ] 계좌별 실시간 평가 손익 및 수익률 추이 차트 UI 고도화
- [ ] 가계부 정기 지출 자동 분류 및 모바일 반응형 뷰 개선
