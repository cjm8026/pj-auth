# Auth 백엔드 마이그레이션 작업 로그

**작업일**: 2026-01-12
**목적**: us-east-1 → ap-northeast-2 리전 마이그레이션 및 배포

---

## ✅ 완료된 작업

### 1. 코드 수정 (8개 파일)
- `.env.example`, `.github/workflows/deploy.yml`
- `k8s/configmap.yaml`, `k8s/deployment.yaml`
- `index.js`, `src/services/authService.ts`, `src/services/s3Service.ts`
- `src/types/database.ts`
- inquiry/report 기능 제거 (2개 파일 삭제)

### 2. AWS Secrets Manager 복사 (4개)
- `library-api/db-password`
- `journal-api/database` (새 RDS 정보로 업데이트)
- `journal-api/aws-credentials`
- `journal-api/bedrock`

### 3. Lambda 함수 생성 (5개)
- `auth-db-query` - Cognito 사용자 삭제
- `QueryDatabase` - DB 관리용
- `CognitoPreSignUp` - 회원가입 검증
- `CognitoPostConfirmation` - 사용자 등록 + S3 폴더 생성
- `CognitoPostAuthentication` - 로그인 기록

### 4. DB 테이블 생성
- `users`, `user_profiles` 테이블 생성 완료
- RDS: `one-postgres.cricim2es6bi.ap-northeast-2.rds.amazonaws.com`

### 5. S3 버킷 확인
- 버킷: `knowledge-base-test-6575574` (us-east-1)
- ap-northeast-2에서 크로스 리전 접근 가능 확인

### 6. GitHub 설정
- 저장소: `https://github.com/cjm8026/pj-auth.git`
- GitHub OIDC Provider 생성
- IAM Role: `GitHubActionsEKSRole`
- ECR 이미지 빌드/푸시 성공

### 7. EKS 배포
- EKS OIDC Provider 생성
- ServiceAccount IAM Role: `fproject-backend-sa-role`
- Kubernetes Secret 생성
- Deployment, Service, ConfigMap 배포

### 8. NLB 연결
- 타겟 그룹: `auth-api-tg` (포트 31663)
- 리스너: 포트 3001
- EKS 노드 2개 등록

### 9. S3 권한 추가
- ServiceAccount Role에 S3 정책 추가
- 권한: PutObject, GetObject, DeleteObject, ListBucket
- 대상: `knowledge-base-test-6575574`

---

## ⏳ 대기 중

### 1. RDS Security Group 규칙 추가 (팀원 작업)
```
RDS SG: sg-0b50a18c464aff963
Source: sg-0b60d2bbbb11e8a3c (EKS Node SG)
Port: 5432
```

### 2. CloudFront 오리진 변경 (선택사항)
```
배포: api.aws11.shop (E1A06B4VNF2L7H)
현재: us-east-1 NLB
변경: one-api-nlb-595f773be0920917.elb.ap-northeast-2.amazonaws.com:3001
```

---

## 📝 리소스 정보

### 신규 리전 (ap-northeast-2)
- EKS: `one`
- RDS: `one-postgres.cricim2es6bi.ap-northeast-2.rds.amazonaws.com`
- Cognito: `ap-northeast-2_mFvtIc1kQ`
- ECR: `324547056370.dkr.ecr.ap-northeast-2.amazonaws.com/auth-api`
- NLB: `one-api-nlb-595f773be0920917.elb.ap-northeast-2.amazonaws.com:3001`

### 기존 리전 (us-east-1)
- RDS: `fproject-dev-postgres.c9eksq6cmh3c.us-east-1.rds.amazonaws.com`
- Cognito: `us-east-1_oesTGe9D5`
- S3: `knowledge-base-test-6575574`

---

## 🔄 다음 단계

1. 팀원이 RDS Security Group 규칙 추가
2. Pod 자동 복구 확인
3. CloudFront 오리진 변경 논의
4. API 테스트

---

## 📌 유용한 명령어

```bash
# Pod 상태
kubectl get pods -l app=fproject-backend

# Pod 로그
kubectl logs -l app=fproject-backend --tail=50

# Deployment 재시작
kubectl rollout restart deployment/fproject-backend
```
