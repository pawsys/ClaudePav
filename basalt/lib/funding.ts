import { prisma } from "./prisma"
import { getCurrentMonth } from "./votes"

export async function allocateFunding(
  userId: string,
  targetType: "user" | "problem" | "solution",
  targetId: string,
  amount: number,
  enabled: boolean = true
) {
  const month = await getCurrentMonth()

  const fundingData: any = {
    fromUserId: userId,
    amount,
    month,
    enabled,
  }

  if (targetType === "user") {
    fundingData.toUserId = targetId
  } else if (targetType === "problem") {
    fundingData.toProblemId = targetId
  } else if (targetType === "solution") {
    fundingData.toSolutionId = targetId
  }

  const funding = await prisma.fundingAllocation.upsert({
    where: {
      fromUserId_toUserId_month:
        targetType === "user"
          ? { fromUserId: userId, toUserId: targetId, month }
          : undefined,
      fromUserId_toProblemId_month:
        targetType === "problem"
          ? { fromUserId: userId, toProblemId: targetId, month }
          : undefined,
      fromUserId_toSolutionId_month:
        targetType === "solution"
          ? { fromUserId: userId, toSolutionId: targetId, month }
          : undefined,
    } as any,
    update: {
      amount,
      enabled,
    },
    create: fundingData,
  })

  return funding
}

export async function calculateTotalFunding(
  targetType: "user" | "problem" | "solution",
  targetId: string,
  month?: string
): Promise<number> {
  const currentMonth = month || await getCurrentMonth()

  const where: any = {
    month: currentMonth,
    enabled: true,
  }

  if (targetType === "user") {
    where.toUserId = targetId
  } else if (targetType === "problem") {
    where.toProblemId = targetId
  } else if (targetType === "solution") {
    where.toSolutionId = targetId
  }

  const fundings = await prisma.fundingAllocation.findMany({ where })

  const total = fundings.reduce((sum, funding) => sum + funding.amount, 0)

  return total
}

export async function toggleFunding(
  userId: string,
  targetType: "user" | "problem" | "solution",
  targetId: string,
  enabled: boolean
) {
  const month = await getCurrentMonth()

  const where: any = { fromUserId: userId, month }

  if (targetType === "user") {
    where.toUserId = targetId
  } else if (targetType === "problem") {
    where.toProblemId = targetId
  } else if (targetType === "solution") {
    where.toSolutionId = targetId
  }

  const funding = await prisma.fundingAllocation.updateMany({
    where,
    data: { enabled },
  })

  return funding
}
