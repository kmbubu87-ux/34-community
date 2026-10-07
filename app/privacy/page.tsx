import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Google Calendar 연동 개인정보처리방침" };

export default function CalendarPrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px", lineHeight: 1.8 }}>
      <p>34사랑 · 34공동체</p>
      <h1>Google Calendar 연동 개인정보처리방침</h1>
      <p>이 안내는 34사랑 앱의 Google Calendar 연결과 심방 일정 관리에 적용됩니다.</p>
      <h2>접근하는 정보와 사용 목적</h2>
      <p>관리자가 Google 계정 연결에 동의하면 앱은 접근 가능한 캘린더의 이름, ID, 접근 권한과 선택한 캘린더의 일정 날짜·시간 및 취소 상태를 확인합니다. 이 정보는 심방 일정을 저장할 캘린더를 선택하고, 일정이 있는 날짜의 심방 신청을 막는 데 사용합니다.</p>
      <p>추가로 선택한 신청 차단용 캘린더에서는 일정 제목·설명·참석자 정보를 요청하지 않으며, 신청자에게는 신청 가능 여부만 표시합니다. 원본 캘린더를 복사하거나 수정하지 않습니다.</p>
      <h2>심방 일정의 저장</h2>
      <p>심방 일정 등록·수정·취소 시 관리자가 지정한 심방 캘린더에 일정을 생성·수정·삭제합니다. 저장되는 내용에는 샘 이름, 신청자와 리더 이름, 장소, 희망 시간 및 참석자 명단이 포함될 수 있습니다. 해당 Google 캘린더의 공유 권한을 가진 사람은 이 내용을 볼 수 있습니다.</p>
      <h2>인증정보의 보관과 보호</h2>
      <p>앱은 연결을 유지하기 위한 Google 갱신 토큰을 암호화하여 데이터베이스에 보관합니다. 캘린더 선택 정보도 연결 설정으로 보관하며, 연결 설정은 앱 관리자만 변경할 수 있습니다. Google 비밀번호는 앱에서 수집하거나 저장하지 않습니다.</p>
      <h2>데이터 처리 서비스와 이용 제한</h2>
      <p>앱 운영에 Google Calendar, Vercel의 앱 호스팅 및 Supabase의 데이터베이스를 사용합니다. Google에서 받은 정보는 캘린더 연동과 심방 일정 관리에 사용하며 광고, 판매, 신용 평가 또는 AI 모델 학습에 사용하지 않습니다.</p>
      <p>34사랑의 Google API 정보 사용 및 다른 앱으로의 전송은 제한적 사용 요건을 포함한 <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>를 따릅니다.</p>
      <h2>연결 해제와 삭제 요청</h2>
      <p>관리자 화면에서 Google 연결을 해제하면 앱에 저장된 갱신 토큰과 캘린더 연결 설정을 삭제하고 추가 접근을 중단합니다. Google 계정의 제3자 연결 관리에서도 앱 접근 권한을 철회할 수 있습니다. 이미 Google 캘린더에 등록된 심방 일정과 앱의 심방 신청 기록은 연결 해제만으로 삭제되지 않습니다. 해당 기록의 삭제는 관리자에게 요청해 주세요.</p>
      <h2>문의</h2>
      <p>운영 담당: 34공동체 문요셉<br />캘린더 연결 및 정보 삭제 문의: <a href="mailto:kmbubu87@gmail.com">kmbubu87@gmail.com</a></p>
      <p>시행일: 2026년 10월 7일</p>
      <Link href="/">34사랑으로 돌아가기</Link>
    </main>
  );
}
