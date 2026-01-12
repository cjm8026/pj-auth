# Auth 백엔드 리전 마이그레이션 작업 요약

## 📋 작업 개요
- **작업일**: 2026-01-12
- **목적**: auth 백엔드를 us-east-1에서 ap-northeast-2로 마이그레이션
- **상태**: 진행 중 (DB 테이블 생성 대기)

---

## ✅ 완료된 작업

### 1. 리전 정보 확인
**기존 (us-east-1):**
- EKS: 클러스터명 미확인
- RDS: `fproject-dev-postgres.c9eksq6cmh3c.us-east-1.rds.amazonaws.com`
- DB: `fproject_db`, User: `fproject_user`
- Cognito: `us-east-1_oesTGe9D5`
- ECR: `fproject-dev-api`

**신규 (ap-northeast-2):**
- EKS: `one`
- RDS: `one-postgres.cricim2es6bi.ap-northeast-2.rds.amazonaws.com`
- DB: `onedb`, User: `oneuser`
- Cognito: `ap-northeast-2_mFvtIc1kQ`
- ECR: `auth-api`
- VPC: `vpc-018b75272caff2c6d`
- Subnets: `subnet-03f93954bf0d1a503`, `subnet-031bb9a3ed10ca84b`
- Security Group: `sg-0a6e1208cca1bb6b1`

### 2. 코드 수정 완료

**수정된 파일 (8개):**
1. `.env.example` - DB, Cognito, 리전 정보
2. `.github/workflows/deploy.yml` - 리전, ECR, EKS, Lambda 환경변수
3. `k8s/configmap.yaml` - RDS, Cognito, 리전
4. `k8s/deployment.yaml` - ECR 이미지 경로
5. `index.js` - Lambda 리전, User Pool ID
6. `src/services/authService.ts` - Lambda URL, 기본 리전
7. `src/services/s3Service.ts` - 기본 리전
8. `src/types/database.ts` - inquiry, report 타입 제거

**삭제된 파일 (2개):**
- `src/services/inquiryService.ts` - 문의 기능 제거
- `src/services/reportService.ts` - 신고 기능 제거

**수정된 컨트롤러/라우트:**
- `server/controllers/userController.ts` - inquiry, report 함수 제거
- `server/routes/userRoutes.ts` - inquiry, report 라우트 제거
- `src/services/userService.ts` - inquiry, report 테이블 삭제 코드 제거

### 3. AWS Secrets Manager 복사 완료

**복사된 시크릿 (4개):**
1. `library-api/db-password` - Library API 데이터베이스 비밀번호
2. `journal-api/database` - DB 연결 정보 (새 리전 RDS로 업데이트)
   - host: `one-postgres.cricim2es6bi.ap-northeast-2.rds.amazonaws.com`
   - dbname: `onedb`
   - username: `oneuser`
3. `journal-api/aws-credentials` - AWS 자격증명
4. `journal-api/bedrock` - Bedrock Flow 정보

### 4. Lambda 함수 생성 완료 (5개)

**1. auth-db-query** (Node.js 20.x)
- 설명: Cognito 사용자 삭제 전용 (AdminDeleteUser)
- Function URL: `https://lt2n4f74ewle5jkvfcsi3s2xae0koolp.lambda-url.ap-northeast-2.on.aws/`
- VPC: 불필요 (Cognito만 접근)
- 환경변수: USER_POOL_ID, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

**2. QueryDatabase** (Python 3.11)
- 설명: PostgreSQL 쿼리 실행 + 회원 탈퇴 처리 (DB/Cognito 삭제)
- VPC: ✅ 연결됨
- 환경변수: USER_POOL_ID, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT
- 용도: DB 디버깅 및 관리용

**3. CognitoPreSignUp** (Python 3.11)
- 설명: 회원가입 전 이메일/닉네임 중복 검사, 구글 로그인 자동 승인
- VPC: ✅ 연결됨
- Cognito 트리거: ✅ 연결됨 (PreSignUp)
- 환경변수: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

**4. CognitoPostConfirmation** (Python 3.11)
- 설명: 이메일 인증 완료 후 DB에 사용자 등록 + S3 프로필 폴더 생성
- VPC: ✅ 연결됨
- Cognito 트리거: ✅ 연결됨 (PostConfirmation)
- 환경변수: S3_BUCKET, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

**5. CognitoPostAuthentication** (Python 3.11)
- 설명: 로그인 성공 시 last_login 타임스탬프 업데이트
- VPC: ✅ 연결됨
- Cognito 트리거: ✅ 연결됨 (PostAuthentication)
- 환경변수: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

**Lambda VPC 설정:**
- VPC ID: `vpc-018b75272caff2c6d`
- Subnets: `subnet-03f93954bf0d1a503`, `subnet-031bb9a3ed10ca84b`
- Security Group: `sg-0a6e1208cca1bb6b1`
- IAM Role: `CognitoLambdaTriggerRole`

---

## ⏳ 남은 작업

### 1. DB 테이블 생성 (필수)
**필요한 테이블:**
- `users` - 사용자 정보
- `user_profiles` - 사용자 프로필

**현재 상태:**
- RDS `onedb` 데이터베이스는 존재하지만 테이블이 비어있음
- Lambda 함수들이 테이블 자동 생성 로직을 포함하고 있음 (CognitoPostConfirmation, CognitoPostAuthentication)

**옵션:**
1. 회원가입 테스트로 자동 생성 (Lambda 트리거 활용)
2. SQL 스크립트로 직접 생성
3. `one-db-table-create` Lambda 실행 (환경변수 수정 필요)

### 2. GitHub Secrets 업데이트
**업데이트 필요한 시크릿:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DB_PASSWORD`
- `EKS_CLUSTER_NAME` (이미 하드코딩: "one")

### 3. 테스트 및 검증
- [ ] DB 연결 테스트
- [ ] Lambda 함수 동작 확인
- [ ] Cognito 회원가입/로그인 플로우 테스트
- [ ] EKS 배포 테스트
- [ ] API 엔드포인트 테스트

### 4. 기타
- [ ] S3 버킷 확인 (`knowledge-base-test-6575574`)
- [ ] CloudFront/도메인 설정 (필요시)
- [ ] 모니터링/로깅 설정

---

## 📝 주요 변경사항 정리

### 제거된 기능
- ❌ **user_inquiries** 테이블 및 관련 코드 (문의 기능)
- ❌ **user_reports** 테이블 및 관련 코드 (신고 기능)
- ❌ `/api/users/report` 엔드포인트
- ❌ `/api/users/inquiry` 엔드포인트
- ❌ `/api/users/inquiries` 엔드포인트

### 유지되는 기능
- ✅ 사용자 프로필 조회/수정
- ✅ 프로필 이미지 업로드/삭제
- ✅ 비밀번호 재설정
- ✅ 회원 탈퇴
- ✅ Cognito 인증

---

## 🔧 다음 세션에서 할 일

1. **DB 테이블 생성**
   - users, user_profiles 테이블 생성
   - 스키마 확인 및 검증

2. **배포 테스트**
   - GitHub Actions 워크플로우 실행
   - EKS Pod 배포 확인
   - API 동작 테스트

3. **문제 해결**
   - 발생하는 에러 디버깅
   - 필요시 추가 설정

---

## 📌 참고 정보

### 테이블 스키마 (Lambda 코드 기반)

**users 테이블:**
```sql
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

**user_profiles 테이블:**
```sql
CREATE TABLE user_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    profile_image_url TEXT,
    bio TEXT,
    phone_number VARCHAR(20),
    additional_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profiles_user_id FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

### 유용한 명령어

**Lambda 테스트:**
```bash
python test_lambda.py
```

**RDS 테이블 조회:**
```python
import boto3, json
lambda_client = boto3.client('lambda', region_name='ap-northeast-2')
response = lambda_client.invoke(
    FunctionName='QueryDatabase',
    Payload=json.dumps({'query': "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"})
)
```

**Git 상태 확인:**
```bash
cd auth
git status
```

---

## ⚠️ 주의사항

1. **VPC Lambda 콜드 스타트**: VPC 내 Lambda는 첫 실행 시 10-30초 소요될 수 있음
2. **DB 비밀번호**: 현재 `test1234`로 하드코딩되어 있음 (프로덕션에서는 Secrets Manager 사용 권장)
3. **중복 Lambda**: auth-* 이름의 중복 Lambda는 이미 삭제됨
4. **기존 팀원 리소스**: `one-db-table-create` Lambda는 다른 팀원 것이므로 건드리지 않음

---

## 📞 문제 발생 시 체크리스트

- [ ] Lambda VPC 설정 확인
- [ ] Security Group 인바운드 규칙 확인 (PostgreSQL 5432 포트)
- [ ] RDS 엔드포인트 및 DB 이름 확인
- [ ] Cognito User Pool ID 확인
- [ ] ECR 이미지 존재 여부 확인
- [ ] IAM Role 권한 확인
