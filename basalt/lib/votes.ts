import { prisma } from "./prisma"
import { format } from "date-fns"

const VOTES_PER_MONTH = 100

export async function getCurrentMonth(): Promise<string> {
  return format(new Date(), "yyyy-MM")
}

export async function getUserVoteAllocation(userId: string, month: string) {
  let allocation = await prisma.voteAllocation.findUnique({
    where: {
      userId_month: {
        userId,
        month,
      },
    },
  })

  if (!allocation) {
    allocation = await prisma.voteAllocation.create({
      data: {
        userId,
        month,
        totalVotes: VOTES_PER_MONTH,
        usedVotes: 0,
      },
    })
  }

  return allocation
}

export async function allocateVotes(
  userId: string,
  targetType: "user" | "problem" | "solution",
  targetId: string,
  amount: number
) {
  const month = await getCurrentMonth()
  const allocation = await getUserVoteAllocation(userId, month)

  if (allocation.usedVotes + amount > allocation.totalVotes) {
    throw new Error("Not enough votes available")
  }

  const voteData: any = {
    fromUserId: userId,
    amount,
    month,
  }

  if (targetType === "user") {
    voteData.toUserId = targetId
  } else if (targetType === "problem") {
    voteData.toProblemId = targetId
  } else if (targetType === "solution") {
    voteData.toSolutionId = targetId
  }

  const vote = await prisma.vote.create({
    data: voteData,
  })

  await prisma.voteAllocation.update({
    where: {
      userId_month: {
        userId,
        month,
      },
    },
    data: {
      usedVotes: allocation.usedVotes + amount,
    },
  })

  return vote
}

export async function calculateTotalVotes(
  targetType: "user" | "problem" | "solution",
  targetId: string,
  month?: string
): Promise<number> {
  const currentMonth = month || await getCurrentMonth()

  const where: any = { month: currentMonth }

  if (targetType === "user") {
    where.toUserId = targetId
  } else if (targetType === "problem") {
    where.toProblemId = targetId
  } else if (targetType === "solution") {
    where.toSolutionId = targetId
  }

  const votes = await prisma.vote.findMany({ where })

  // Direct votes
  let total = votes.reduce((sum, vote) => sum + vote.amount, 0)

  // For problems and solutions, also add delegated votes from users
  if (targetType === "problem" || targetType === "solution") {
    // TODO: Implement recursive vote calculation for delegated votes
    // This would involve traversing the vote graph to find indirect votes
  }

  return total
}

export async function getRankings(
  type: "user" | "problem" | "solution",
  month?: string,
  limit: number = 10
) {
  const currentMonth = month || await getCurrentMonth()

  let items: any[] = []

  if (type === "user") {
    items = await prisma.user.findMany({
      include: {
        votesReceived: {
          where: { month: currentMonth },
        },
      },
    })
  } else if (type === "problem") {
    items = await prisma.problem.findMany({
      include: {
        votesReceived: {
          where: { month: currentMonth },
        },
        createdBy: true,
      },
    })
  } else if (type === "solution") {
    items = await prisma.solution.findMany({
      include: {
        votesReceived: {
          where: { month: currentMonth },
        },
        createdBy: true,
        problem: true,
      },
    })
  }

  const ranked = items
    .map((item) => ({
      ...item,
      totalVotes: item.votesReceived.reduce(
        (sum: number, vote: any) => sum + vote.amount,
        0
      ),
    }))
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, limit)

  return ranked
}
