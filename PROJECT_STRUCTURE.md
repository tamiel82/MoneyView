# MoneyView 프로젝트 구조 문서

## 1. 프로젝트 개요
**MoneyView**는 개인 자산 및 가계부를 효율적으로 관리하기 위해 구축된 100% 클라우드 기반의 웹 애플리케이션입니다.
최근 로컬 SQLite 기반의 아키텍처에서 클라우드(Supabase + Vercel)로 성공적으로 마이그레이션되어, PC 구동 여부와 관계없이 24시간 접근 가능한 시스템을 완성했습니다.

- **주요 기능**: 가계부 내역(수입/지출) 관리, 은행/카드사 엑셀 내역 파싱 및 자동 분류, 자산 포트폴리오(주식/현금/부동산 등) 추적, 구글 시트 백업 및 동기화, 대시보드(자산 차트, 월별 통계 등).
- **배포 주소**: `https://moneyview.tamiel.org`

## 2. 시스템 아키텍처 (100% 클라우드)
- **프론트엔드 (Vercel)**: Next.js (App Router) 기반의 React 애플리케이션. Vercel Edge Network를 통해 전 세계 어디서든 빠르게 제공됩니다.
- **백엔드 (Vercel Serverless Functions)**: Next.js의 API Routes (`/app/api/...`)를 활용하여 Vercel 환경에서 서버리스 형태로 동작합니다. 더 이상 로컬 PC(`run_server.bat`)가 필요하지 않습니다.
- **데이터베이스 (Supabase)**: 오픈소스 Firebase 대안인 Supabase(PostgreSQL)를 사용하여 거래 내역(`transactions`), 월별 통계(`monthly_stats`), 카테고리 룰(`categories`) 등을 안전하게 저장합니다.
- **백업 및 동기화 (Google Sheets)**: 데이터 안정성과 외부 조회(가족 공유 등)를 위해, 내역이 추가/수정/삭제될 때마다 Google Sheets API를 통해 백그라운드에서 실시간으로 엑셀(스프레드시트)에 미러링 백업을 수행합니다.

## 3. 디렉토리 구조 요약
```text
MoneyView/
├── src/
│   ├── app/                    # Next.js App Router (UI 및 API 진입점)
│   │   ├── accounting/         # 가계부 관리 (내역 조회, 엑셀 임포트 등)
│   │   ├── accounts/           # 자산 계좌 및 잔고 관리
│   │   ├── api/                # 백엔드 API (Serverless)
│   │   │   ├── accounting/     # DB 트랜잭션, 월별/연도별 통계, 엑셀/시트 동기화 API
│   │   │   ├── history/        # 자산 변동 이력 및 환율 API
│   │   │   ├── portfolio/      # 포트폴리오 주식 및 자산 비율 계산 API
│   │   │   └── auth/           # NextAuth 기반 구글 소셜 로그인
│   │   ├── history/            # 자산 히스토리 조회 페이지
│   │   ├── monthly/            # 월별 자산 요약 페이지
│   │   ├── layout.tsx          # 글로벌 레이아웃 (Navbar, Sidebar 포함)
│   │   └── page.tsx            # 메인 대시보드 페이지
│   ├── components/             # 재사용 가능한 UI 컴포넌트 모음
│   │   ├── accounting/         # 거래 내역 표(TransactionGrid 등)
│   │   ├── dashboard/          # 자산 요약, 차트, 환율 모니터 모음
│   │   ├── history/            # 환율 표, 거래 이력 표
│   │   └── layout/             # 헤더, 모바일 메뉴
│   ├── lib/                    # 핵심 비즈니스 로직 및 외부 서비스 연동
│   │   ├── accounting/         # 엑셀 파서(은행별), 카테고리 자동 분류기(Classifier)
│   │   ├── googleSheets.ts     # 구글 시트 백그라운드 미러링 및 복원 로직
│   │   └── supabase.ts         # Supabase 연결 클라이언트 생성
│   └── types/                  # TypeScript 타입 정의 파일들
├── .env.local                  # 환경 변수 (Supabase, Google, NextAuth 키 등)
├── supabase_schema.sql         # Supabase DB 테이블 스키마 초기화 스크립트
├── package.json                # 의존성 패키지 관리
└── PROJECT_STRUCTURE.md        # (현재 파일) 프로젝트 구조 문서
```

## 4. 핵심 데이터 플로우 (Data Flow)
1. **인증 및 접근**: NextAuth.js를 통해 Google 계정으로 로그인합니다. `NEXTAUTH_URL` 설정에 따라 보안이 유지됩니다.
2. **데이터 입력 (엑셀 업로드 등)**:
   - 사용자가 은행/카드사 엑셀 파일을 업로드하면 `/api/accounting/upload` API가 호출됩니다.
   - `src/lib/accounting/parsers.ts`가 파일 포맷을 분석해 알맞은 파서로 파싱합니다.
   - `src/lib/accounting/classifier.ts`가 Supabase의 `categories` 테이블 룰을 기반으로 거래 내역(가맹점)의 카테고리를 자동 분류합니다.
3. **데이터베이스 저장 및 백업**:
   - 분류된 데이터가 Supabase PostgreSQL(`transactions` 테이블)에 저장됩니다.
   - 저장이 완료되면 사용자의 화면 응답(Response)을 지연시키지 않도록, 비동기 백그라운드 작업으로 `syncTransactionsToSheet()`가 호출되어 구글 시트에 내역이 덮어씌워집니다.
4. **포트폴리오 및 환율(Google Finance)**:
   - 포트폴리오 및 월간 자산 내역은 구글 시트의 `GOOGLEFINANCE` 함수를 적극 활용하여 주식의 실시간 현재가와 환율(USDKRW 등)을 자동으로 불러옵니다.
   - `portfolioService.ts`와 `historyService.ts`를 통해 구글 시트의 계산된 결과값을 가져와서 화면 대시보드에 뿌려줍니다.

## 5. 기존 환경 대비 개선 사항
- **탈 로컬(Local-Free)**: 과거 `run_server.bat`를 통한 Cloudflare 터널링이 더 이상 필요하지 않습니다. PC를 꺼도 어디서든 접속할 수 있습니다.
- **성능 및 안정성 향상**: SQLite 파일 DB의 I/O 병목이 사라지고, 강력한 관계형 DB인 Supabase(PostgreSQL)를 사용하여 동시 접속 및 데이터 안정성이 대폭 상승했습니다.
- **백업 자동화**: 구글 시트를 DB로 쓸 때 발생하던 '느린 속도'를 해결하면서도, 데이터 백업과 외부 뷰어 역할을 구글 시트가 그대로 수행할 수 있도록 하이브리드 미러링을 구현했습니다.
