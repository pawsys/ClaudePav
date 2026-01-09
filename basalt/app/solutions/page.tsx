import Link from "next/link"
import NodeCard from "@/components/NodeCard"

export default function SolutionsPage() {
  // Mock data - in production this would come from the database
  const solutions = [
    {
      id: "1",
      title: "Renewable Energy Initiative",
      description: "Transitioning communities to 100% renewable energy sources through solar and wind projects",
      votes: 654,
      funding: 4200,
      category: "Environment",
    },
    {
      id: "2",
      title: "Community Health Centers",
      description: "Establishing accessible healthcare facilities in underserved areas with mobile clinics",
      votes: 543,
      funding: 3800,
      category: "Health",
    },
    {
      id: "3",
      title: "Free Coding Bootcamps",
      description: "Providing tech education to disadvantaged youth through intensive training programs",
      votes: 487,
      funding: 3200,
      category: "Education",
    },
    {
      id: "4",
      title: "Urban Farming Network",
      description: "Creating community gardens and rooftop farms to increase local food production",
      votes: 421,
      funding: 2900,
      category: "Environment",
    },
    {
      id: "5",
      title: "Public WiFi Expansion",
      description: "Installing free high-speed internet access points in underserved neighborhoods",
      votes: 398,
      funding: 2600,
      category: "Technology",
    },
    {
      id: "6",
      title: "Affordable Housing Co-ops",
      description: "Developing cooperative housing models for low-income families",
      votes: 356,
      funding: 2200,
      category: "Community",
    },
  ]

  const categories = ["All", "Environment", "Health", "Education", "Technology", "Community"]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Solutions</h1>
            <p className="text-gray-600">
              Discover and support organizations and projects working to solve critical problems
            </p>
          </div>
          <Link
            href="/solutions/new"
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            + Add Solution
          </Link>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                category === "All"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </main>
  )
}
