"use client"

import { useState } from "react"

interface VoteSliderProps {
  available: number
  onVote: (amount: number) => void
  currentVotes?: number
}

export default function VoteSlider({
  available,
  onVote,
  currentVotes = 0,
}: VoteSliderProps) {
  const [votes, setVotes] = useState(currentVotes)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    setVotes(value)
  }

  const handleSubmit = () => {
    if (votes > 0 && votes <= available + currentVotes) {
      onVote(votes)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Allocate votes</span>
        <span className="text-sm font-medium">
          {votes} / {available + currentVotes} available
        </span>
      </div>

      <input
        type="range"
        min="0"
        max={available + currentVotes}
        value={votes}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max={available + currentVotes}
          value={votes}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded-md w-24"
        />
        <button
          onClick={handleSubmit}
          disabled={votes === 0 || votes > available + currentVotes}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Allocate
        </button>
      </div>
    </div>
  )
}
