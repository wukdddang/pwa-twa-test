import { NextRequest, NextResponse } from "next/server";
import { sendNotificationToToken, sendNotificationToMultipleTokens } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, tokens, title, message, data } = body;

    // 입력 검증
    if (!title || !message) {
      return NextResponse.json({ error: "제목과 메시지는 필수입니다." }, { status: 400 });
    }

    if (!token && !tokens) {
      return NextResponse.json({ error: "토큰 또는 토큰 배열이 필요합니다." }, { status: 400 });
    }

    let result;

    if (token) {
      // 단일 토큰으로 알림 발송
      result = await sendNotificationToToken(token, title, message, data);
    } else if (tokens && Array.isArray(tokens)) {
      // 다중 토큰으로 알림 발송
      result = await sendNotificationToMultipleTokens(tokens, title, message, data);
    }

    if (result?.success) {
      return NextResponse.json({
        success: true,
        message: "알림이 성공적으로 발송되었습니다.",
        result,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "알림 발송에 실패했습니다.",
          details: result?.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("알림 발송 API 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// 테스트용 GET 엔드포인트
export async function GET() {
  return NextResponse.json({
    message: "FCM 알림 발송 API가 정상적으로 작동 중입니다.",
    endpoints: {
      POST: "/api/send-notification",
      body: {
        token: "string (단일 토큰)",
        tokens: "string[] (다중 토큰)",
        title: "string (필수)",
        message: "string (필수)",
        data: "object (선택사항)",
      },
    },
  });
}
