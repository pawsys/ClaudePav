"use client"

import { useState } from "react"
import NodeCard from "@/components/NodeCard"

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<"problems" | "solutions" | "users">("problems")

  const problemRankings = [
    {
      id: "1",
      title: "Climate Change",
      description: "Global warming and environmental degradation affecting ecosystems worldwide",
      votes: 1247,
      funding: 8500,
    },
    {
      id: "2",
      title: "Healthcare Access",
      description: "Ensuring affordable and quality healthcare for all communities",
      votes: 982,
      funding: 6200,
    },
    {
      id: "3",
      title: "Education Inequality",
      description: "Addressing disparities in educational opportunities and resources",
      votes: 876,
      funding: 5100,
    },
  ]

  const solutionRankings = [
    {
      id: "1",
      title: "Renewable Energy Initiative",
      description: "Transitioning communities to 100% renewable energy sources",
      votes: 654,
      funding: 4200,
    },
    {
      id: "2",
      title: "Community Health Centers",
      description: "Establishing accessible healthcare facilities in underserved areas",
      votes: 543,
      funding: 3800,
    },
    {
      id: "3",
      title: "Free Coding Bootcamps",
      description: "Providing tech education to disadvantaged youth",
      votes: 487,
      funding: 3200,
    },
  ]

  const userRankings = [
    {
      id: "1",
      title: "Sarah Johnson",
      description: "Climate activist and environmental policy researcher",
      votes: 342,
      funding: 1800,
      avatar: "/avatars/sarah.jpg",
    },
    {
      id: "2",
      title: "Michael Chen",
      description: "Healthcare advocate and community organizer",
      votes: 289,
      funding: 1500,
      avatar: "/avatars/michael.jpg",
    },
    {
      id: "3",
      title: "Elena Rodriguez",
      description: "Education reform specialist and teacher",
      votes: 234,
      funding: 1200,
      avatar: "/avatars/elena.jpg",
    },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Rankings</h1>
          <p className="text-gray-600">
            See what the community is prioritizing this month
          </p>
        </div>

        {/* View Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("problems")}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "problems"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Top Problems
            </button>
            <button
              onClick={() => setActiveTab("solutions")}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "solutions"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Top Solutions
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "users"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Top Contributors
            </button>
          </div>
        </div>

        {/* Rankings List */}
        <div className="space-y-6">
          {activeTab === "problems" &&
            problemRankings.map((problem, index) => (
              <div key={problem.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <NodeCard
                    type="problem"
                    id={problem.id}
                    title={problem.title}
                    description={problem.description}
                    votes={problem.votes}
                    funding={problem.funding}
                  />
                </div>
              </div>
            ))}

          {activeTab === "solutions" &&
            solutionRankings.map((solution, index) => (
              <div key={solution.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <NodeCard
                    type="solution"
                    id={solution.id}
                    title={solution.title}
                    description={solution.description}
                    votes={solution.votes}
                    funding={solution.funding}
                  />
                </div>
              </div>
            ))}

          {activeTab === "users" &&
            userRankings.map((user, index) => (
              <div key={user.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <NodeCard
                    type="user"
                    id={user.id}
                    title={user.title}
                    description={user.description}
                    votes={user.votes}
                    funding={user.funding}
                    avatar={user.avatar}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  )
}
