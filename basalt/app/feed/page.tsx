import NodeCard from "@/components/NodeCard"

export default function FeedPage() {
  // Mock feed data - in production this would come from the database
  const feedItems = [
    {
      type: "problem" as const,
      id: "1",
      title: "Climate Change",
      description: "Global warming and environmental degradation affecting ecosystems worldwide",
      votes: 1247,
      funding: 8500,
      timestamp: "2 hours ago",
    },
    {
      type: "solution" as const,
      id: "1",
      title: "Renewable Energy Initiative",
      description: "Transitioning communities to 100% renewable energy sources",
      votes: 654,
      funding: 4200,
      timestamp: "4 hours ago",
    },
    {
      type: "problem" as const,
      id: "2",
      title: "Healthcare Access",
      description: "Ensuring affordable and quality healthcare for all communities",
      votes: 982,
      funding: 6200,
      timestamp: "6 hours ago",
    },
    {
      type: "solution" as const,
      id: "2",
      title: "Community Health Centers",
      description: "Establishing accessible healthcare facilities in underserved areas",
      votes: 543,
      funding: 3800,
      timestamp: "8 hours ago",
    },
    {
      type: "problem" as const,
      id: "3",
      title: "Education Inequality",
      description: "Addressing disparities in educational opportunities and resources",
      votes: 876,
      funding: 5100,
      timestamp: "1 day ago",
    },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Feed</h1>
          <p className="text-gray-600">
            Recent activity from your network and trending priorities
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button className="px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              All Activity
            </button>
            <button className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              Following
            </button>
            <button className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              Trending
            </button>
          </div>
        </div>

        {/* Feed Items */}
        <div className="space-y-6">
          {feedItems.map((item, index) => (
            <div key={index} className="relative">
              <div className="absolute -left-4 top-6 text-xs text-gray-500">
                {item.timestamp}
              </div>
              <NodeCard
                type={item.type}
                id={item.id}
                title={item.title}
                description={item.description}
                votes={item.votes}
                funding={item.funding}
              />
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <button className="px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium">
            Load More
          </button>
        </div>
      </div>
    </main>
  )
}
