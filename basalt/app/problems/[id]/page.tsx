"use client"

import { useState } from "react"
import Link from "next/link"
import VoteSlider from "@/components/VoteSlider"
import NodeCard from "@/components/NodeCard"

export default function ProblemPage({ params }: { params: { id: string } }) {
  const [availableVotes, setAvailableVotes] = useState(100)

  // Mock problem data
  const problem = {
    id: params.id,
    title: "Climate Change",
    description:
      "Global warming and environmental degradation affecting ecosystems worldwide. Rising temperatures, extreme weather events, and loss of biodiversity threaten the future of our planet and require urgent collective action.",
    category: "Environment",
    votes: 1247,
    funding: 8500,
    createdBy: {
      id: "1",
      name: "Sarah Johnson",
      avatar: "/avatars/sarah.jpg",
    },
    createdAt: "2024-01-15",
  }

  const solutions = [
    {
      id: "1",
      title: "Renewable Energy Initiative",
      description:
        "Transitioning communities to 100% renewable energy sources through solar and wind projects",
      votes: 654,
      funding: 4200,
    },
    {
      id: "4",
      title: "Urban Farming Network",
      description:
        "Creating community gardens and rooftop farms to increase local food production",
      votes: 421,
      funding: 2900,
    },
  ]

  const topVoters = [
    { id: "1", name: "Sarah Johnson", votes: 45 },
    { id: "2", name: "Michael Chen", votes: 38 },
    { id: "3", name: "Elena Rodriguez", votes: 32 },
  ]

  const handleVote = (amount: number) => {
    console.log(`Allocating ${amount} votes to ${problem.title}`)
    setAvailableVotes(availableVotes - amount)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Problem Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              {problem.category}
            </span>
            <Link
              href={`/users/${problem.createdBy.id}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
              <span>Posted by {problem.createdBy.name}</span>
            </Link>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {problem.title}
          </h1>
          <p className="text-lg text-gray-600 mb-6">{problem.description}</p>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{problem.votes} votes</span>
            </div>
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>${problem.funding}/mo funding</span>
            </div>
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Created {problem.createdAt}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Vote Allocation */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Allocate Votes
              </h2>
              <VoteSlider
                available={availableVotes}
                onVote={handleVote}
                currentVotes={0}
              />
            </div>

            {/* Solutions Addressing This Problem */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Solutions Addressing This Problem
                </h2>
                <Link
                  href={`/solutions/new?problemId=${problem.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  + Propose Solution
                </Link>
              </div>
              <div className="space-y-4">
                {solutions.map((solution) => (
                  <NodeCard
                    key={solution.id}
                    type="solution"
                    id={solution.id}
                    title={solution.title}
                    description={solution.description}
                    votes={solution.votes}
                    funding={solution.funding}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Funding Toggle */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Funding
              </h3>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">
                  Fund this problem with your votes
                </span>
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Funding will be distributed to solutions addressing this problem
              </p>
            </div>

            {/* Top Voters */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Voters
              </h3>
              <div className="space-y-3">
                {topVoters.map((voter, index) => (
                  <Link
                    key={voter.id}
                    href={`/users/${voter.id}`}
                    className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        #{index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {voter.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {voter.votes} votes
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Problem Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total voters</span>
                  <span className="font-medium">234</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Solutions proposed</span>
                  <span className="font-medium">{solutions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">This month's rank</span>
                  <span className="font-medium">#1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
