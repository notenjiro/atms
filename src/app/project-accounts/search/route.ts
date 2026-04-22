import { NextResponse } from "next/server";

import { listProjectAccounts } from "@/modules/project-accounts/project-account.repository";

function isValidContract(contractNo: string | undefined | null): boolean {
  if (!contractNo) return false;

  const value = contractNo.trim();

  if (!value) return false;

  // ❌ ตัด Mongo ObjectId (24 hex)
  if (/^[a-f0-9]{24}$/i.test(value)) {
    return false;
  }

  // ❌ ตัดค่าที่สั้น/มั่วเกินไป
  if (value.length < 5) {
    return false;
  }

  return true;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = searchParams.get("q") ?? "";
    const q = qRaw.trim().toLowerCase();

    if (!q) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const items = await listProjectAccounts();

    const results = items
      .filter((item) => {
        const projectName = String(item.projectName ?? "").toLowerCase();
        const customerName = String(item.customerName ?? "").toLowerCase();
        const contractNo = String(item.contractNo ?? "").toLowerCase();

        return (
          projectName.includes(q) ||
          customerName.includes(q) ||
          contractNo.includes(q)
        );
      })
      // 🔥 ตัดของขยะตรงนี้
      .filter((item) => isValidContract(item.contractNo))
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        projectName: item.projectName,
        customerName: item.customerName,
        contractNo: item.contractNo,
        startDate: item.startDate,
        endDate: item.endDate,
      }));

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to search project accounts",
      },
    });
  }
}