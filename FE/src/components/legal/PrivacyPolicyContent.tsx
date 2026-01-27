import React from 'react';
import "../../styles/legal.css"; // CSS 임포트

const PrivacyPolicyContent: React.FC = () => {
  return (
    <div className="legal-container"> {/* 클래스명 적용 */}
      <h1>개인정보 처리방침</h1>
      <p><strong>ARNNECT</strong>(이하 '서비스')는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 제30조에 따라 이용자의 개인정보 보호 및 권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.</p>

      <h3>1. 개인정보의 수집 및 이용 목적</h3>
      <p>서비스는 다음의 목적을 위해 최소한의 개인정보를 수집합니다.</p>
      <ul>
        <li><strong>회원 관리:</strong> 회원 가입 의사 확인, 본인 식별, 서비스 부정이용 방지</li>
        <li><strong>서비스 제공:</strong> 예술 작품 추천, 아티스트-사용자 간 매칭, 취향 기반 피드 구성</li>
        <li><strong>마케팅 및 광고:</strong> 신규 서비스 개발 및 맞춤 서비스 제공(선택 동의 시)</li>
      </ul>

      <h3>2. 개인정보의 보유 및 이용기간</h3>
      <p>이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 단, 다음의 정보는 관련 법령에 의거하여 보존합니다.</p>
      <ul>
        <li><strong>로그인 기록:</strong> 3개월 (통신비밀보호법)</li>
        <li><strong>소비자 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래법)</li>
        <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래법)</li>
      </ul>

      <h3>3. 개인정보 보호책임자</h3>
      <p>서비스 이용 중 발생하는 모든 개인정보 보호 관련 민원은 아래의 보호책임자에게 문의하실 수 있습니다. (이메일: support@arnnect.com)</p>
    </div>
  );
};

export default PrivacyPolicyContent;