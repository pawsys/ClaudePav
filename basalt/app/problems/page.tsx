import Link from "next/link"
import NodeCard from "@/components/NodeCard"

export default function ProblemsPage() {
  // Mock data - in production this would come from the database
  const problems = [
    {
      id: "1",
      title: "Climate Change",
      description: "Global warming and environmental degradation affecting ecosystems worldwide",
      votes: 1247,
      funding: 8500,
      category: "Environment",
    },
    {
      id: "2",
      title: "Healthcare Access",
      description: "Ensuring affordable and quality healthcare for all communities",
      votes: 982,
      funding: 6200,
      category: "Health",
    },
    {
      id: "3",
      title: "Education Inequality",
      description: "Addressing disparities in educational opportunities and resources",
      votes: 876,
      funding: 5100,
      category: "Education",
    },
    {
      id: "4",
      title: "Food Security",
      description: "Ensuring access to nutritious food for all populations",
      votes: 743,
      funding: 4300,
      category: "Health",
    },
    {
      id: "5",
      title: "Digital Divide",
      description: "Bridging the gap in internet and technology access",
      votes: 621,
      funding: 3700,
      category: "Technology",
    },
    {
      id: "6",
      title: "Housing Crisis",
      description: "Addressing affordable housing shortages in urban areas",
      votes: 589,
      funding: 3200,
      category: "Community",
    },
  ]

  const categories = ["All", "Environment", "Health", "Education", "Technology", "Community"]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Problems</h1>
            <p className="text-gray-600">
              Explore and vote on the most pressing challenges facing our communities
            </p>
          </div>
          <Link
            href="/problems/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Add Problem
          </Link>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                category === "All"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem) => (
            <NodeCard
              key={problem.id}
              type="problem"
              id={problem.id}
              title={problem.title}
              description={problem.description}
              votes={problem.votes}
              funding={problem.funding}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
