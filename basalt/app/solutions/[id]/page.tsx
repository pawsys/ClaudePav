"use client"

import { useState } from "react"
import Link from "next/link"
import VoteSlider from "@/components/VoteSlider"

export default function SolutionPage({ params }: { params: { id: string } }) {
  const [availableVotes, setAvailableVotes] = useState(100)

  // Mock solution data
  const solution = {
    id: params.id,
    title: "Renewable Energy Initiative",
    description:
      "Transitioning communities to 100% renewable energy sources through solar and wind projects. We're installing solar panels on residential and commercial buildings, developing community wind farms, and providing education on energy efficiency.",
    website: "https://renewableinitiative.org",
    category: "Environment",
    votes: 654,
    funding: 4200,
    problem: {
      id: "1",
      title: "Climate Change",
    },
    createdBy: {
      id: "1",
      name: "Sarah Johnson",
      avatar: "/avatars/sarah.jpg",
    },
    createdAt: "2024-02-10",
  }

  const topVoters = [
    { id: "1", name: "Sarah Johnson", votes: 30 },
    { id: "2", name: "Michael Chen", votes: 25 },
    { id: "3", name: "Elena Rodriguez", votes: 20 },
  ]

  const milestones = [
    { title: "100 homes powered by solar", completed: true },
    { title: "Community wind farm operational", completed: true },
    { title: "1000 homes powered by renewables", completed: false },
    { title: "Carbon neutral community", completed: false },
  ]

  const handleVote = (amount: number) => {
    console.log(`Allocating ${amount} votes to ${solution.title}`)
    setAvailableVotes(availableVotes - amount)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Solution Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {solution.category}
              </span>
              <Link
                href={`/problems/${solution.problem.id}`}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Addresses: {solution.problem.title}
              </Link>
            </div>
            <Link
              href={`/users/${solution.createdBy.id}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
              <span>Created by {solution.createdBy.name}</span>
            </Link>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {solution.title}
          </h1>
          <p className="text-lg text-gray-600 mb-6">{solution.description}</p>

          {solution.website && (
            <a
              href={solution.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  clipRule="evenodd"
                />
              </svg>
              Visit website
            </a>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{solution.votes} votes</span>
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
              <span>${solution.funding}/mo funding</span>
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
              <span>Created {solution.createdAt}</span>
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

            {/* Milestones */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Milestones
              </h2>
              <div className="space-y-3">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        milestone.completed
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    >
                      {milestone.completed && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`${
                        milestone.completed
                          ? "text-gray-900"
                          : "text-gray-500"
                      }`}
                    >
                      {milestone.title}
                    </span>
                  </div>
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
                  Fund this solution with your votes
                </span>
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Funding goes directly to this organization
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
                Solution Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total voters</span>
                  <span className="font-medium">156</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Funding received</span>
                  <span className="font-medium">${solution.funding * 6}</span>
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
