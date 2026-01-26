import { http } from "./http";

export const pingLounge = async () => {
  console.log("[FE → SERVER] GET /me/lounge 요청 송출");

  try {
    const res = await http.get("/me/lounge");
    console.log("[SERVER → FE] /me/lounge 응답 수신", res.data);
    return res.data;
  } catch (error) {
    console.warn("[SERVER ❌] /me/lounge 연결 실패 (서버 미기동 상태)");
    return null;
  }
};
