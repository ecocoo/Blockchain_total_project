"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useContractRead, useContractWrite, usePublicClient } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [selectedYearIndex, setSelectedYearIndex] = useState<number | null>(null);
  const [userVotedYearIndex, setUserVotedYearIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const publicClient = usePublicClient();

  const { data: contractInfo } = useDeployedContractInfo("BestYearForGamesVoting");

  const { 
    data: votingInfo, 
    refetch: refetchVotingInfo,
    isLoading: isVotingInfoLoading
  } = useContractRead({
    address: contractInfo?.address,
    abi: contractInfo?.abi,
    functionName: "getVotingInfo",
    args: [],
    enabled: !!contractInfo,
  });

  const { 
    data: hasVoted,
    refetch: refetchHasVoted
  } = useContractRead({
    address: contractInfo?.address,
    abi: contractInfo?.abi,
    functionName: "hasAddressVoted",
    args: [address], 
    enabled: !!contractInfo && !!address,
  });

  const { writeContractAsync } = useContractWrite();

  useEffect(() => {
    if (address) {
      const savedVote = localStorage.getItem(`vote_${address}`);
      if (hasVoted === false) {
        setUserVotedYearIndex(null);
      } else if (savedVote) {
        const parsedVote = parseInt(savedVote, 10);
        if (!isNaN(parsedVote)) {
          setUserVotedYearIndex(parsedVote);
        }
      }
    }
  }, [address, hasVoted]);

  const handleVote = async () => {
    if (!isConnected || hasVoted || selectedYearIndex === null || !contractInfo) {
      return;
    }
    setIsProcessing(true);
    
    try {
      const hash = await writeContractAsync({
        address: contractInfo.address,
        abi: contractInfo.abi,
        functionName: "vote",
        args: [BigInt(selectedYearIndex)],
      });
      
      if (publicClient && hash) {
        await publicClient.waitForTransactionReceipt({ 
          hash: hash as `0x${string}`,
          confirmations: 1,
        });
        
        if (address) {
          localStorage.setItem(`vote_${address}`, selectedYearIndex.toString());
          setUserVotedYearIndex(selectedYearIndex);
        }
        
        await Promise.all([refetchVotingInfo(), refetchHasVoted()]);
      }
      
      setSelectedYearIndex(null);
      
    } catch (error: any) {
      console.error("❌ Voting error:", error); 
    } finally {
      setIsProcessing(false);
    }
  };

  const votingData = useMemo(() => {
    if (!votingInfo || !Array.isArray(votingInfo)) {
      return {
        options: Array.from({ length: 11 }, (_, i) => `${2015 + i}`),
        votes: Array(11).fill(0),
        endTime: 0,
        isActive: true,
        totalVotes: 0
      };
    }

    const [endTime, isActive, votesArray, totalVotesFromContract] = votingInfo;

    const votes = Array.isArray(votesArray) && votesArray.length === 11
      ? votesArray.map((v: any) => Number(v) || 0)
      : Array(11).fill(0);

    const totalVotes = votes.reduce((acc, curr) => acc + curr, 0);

    return {
      options: Array.from({ length: 11 }, (_, i) => `${2015 + i}`),
      votes,
      endTime: Number(endTime) || 0,
      isActive: Boolean(isActive),
      totalVotes: Math.max(totalVotes, Number(totalVotesFromContract || 0))
    };
  }, [votingInfo]);

  const { options, votes, endTime, isActive, totalVotes } = votingData;

  const getVotePercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0;
    return (voteCount / totalVotes) * 100;
  };

  const timeLeft = useMemo(() => {
    if (!endTime || endTime === 0) {
      return { days: 0, hours: 0, minutes: 0 };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const difference = endTime - now;
    
    if (difference <= 0) return { days: 0, hours: 0, minutes: 0 };
    
    return {
      days: Math.floor(difference / (60 * 60 * 24)),
      hours: Math.floor((difference / (60 * 60)) % 24),
      minutes: Math.floor((difference / 60) % 60),
    };
  }, [endTime]);

  const isVotingEnded = !isActive || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${contractInfo ? 'text-green-400' : 'text-yellow-400'}`}>
              <div className={`w-3 h-3 rounded-full ${contractInfo ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm font-medium">
                {contractInfo ? "✅ Contract Ready" : "⏳ Loading Contract..."}
              </span>
            </div>
            
            <div className={`flex items-center gap-2 ${isVotingEnded ? 'text-red-400' : 'text-green-400'}`}>
              <div className={`w-3 h-3 rounded-full ${isVotingEnded ? 'bg-red-400' : 'bg-green-400'}`}></div>
              <span className="text-sm font-medium">
                {isVotingEnded ? "⏰ Voting Ended" : "✅ Voting Active"}
              </span>
            </div>
          </div>
        </div>

        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            🎮 Best Year for Video Games (2015-2025)
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-2">
            Vote for the peak year of gaming history!
          </p>
          <p className="text-sm text-gray-500">
            {isConnected 
              ? `Connected: ${address?.slice(0, 8)}...${address?.slice(-6)}` 
              : "🔗 Connect your wallet to vote"}
          </p>
          
          {hasVoted && userVotedYearIndex !== null && (
            <div className="mt-4 inline-block bg-green-900/30 text-green-400 px-4 py-2 rounded-lg border border-green-700">
              ✅ You voted for <span className="font-bold text-xl">{2015 + userVotedYearIndex}</span>
            </div>
          )}
          
          {isVotingEnded && (
            <div className="mt-4 inline-block bg-red-900/30 text-red-400 px-4 py-2 rounded-lg border border-red-700">
              ⏰ Voting has ended
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700">
            <div className="text-gray-400 mb-1 text-sm font-medium">Total Votes</div>
            <p className="text-3xl font-bold">
              {isVotingInfoLoading ? "..." : totalVotes.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700">
            <div className="text-gray-400 mb-1 text-sm font-medium">Time Left</div>
            <p className={`text-2xl font-bold ${isVotingEnded ? 'text-red-400' : 'text-green-400'}`}>
              {isVotingEnded ? "Ended" : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`}
            </p>
          </div>
          
          <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700">
            <div className="text-gray-400 mb-1 text-sm font-medium">Your Status</div>
            <p className={`text-2xl font-bold ${hasVoted ? 'text-green-400' : 'text-yellow-400'}`}>
              {hasVoted ? "✅ Voted" : "⏳ Not Voted"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          {options.map((year: string, index: number) => {
            const votesForYear = votes[index] || 0;
            const percentage = getVotePercentage(votesForYear);
            const isSelected = selectedYearIndex === index;
            const isUserVote = hasVoted && userVotedYearIndex === index;
            
            return (
              <button
                key={`${year}-${index}`}
                onClick={() => !hasVoted && !isVotingEnded && setSelectedYearIndex(index)}
                disabled={hasVoted || isVotingEnded}
                className={`p-5 rounded-xl border-2 transition-all duration-300 ${
                  isUserVote
                    ? 'border-green-500 bg-gradient-to-br from-green-900/30 to-green-500/10 shadow-lg shadow-green-500/20'
                    : isSelected
                    ? 'border-cyan-500 bg-gradient-to-br from-cyan-900/30 to-cyan-500/10 shadow-lg shadow-cyan-500/20'
                    : 'border-gray-700 hover:border-cyan-400/50 hover:bg-gray-800/30'
                } ${(hasVoted || isVotingEnded) && !isUserVote ? 'opacity-50' : ''}`}
              >
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold mb-3">
                    {year}
                  </div>
                  
                  <div className="text-lg font-semibold mb-1">
                    {votesForYear} vote{votesForYear !== 1 ? 's' : ''}
                  </div>
                  
                  <div className="relative w-full bg-gray-800 rounded-full h-4 mb-2 overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-gray-400 text-sm">
                    {percentage.toFixed(1)}%
                  </div>
                  
                  {isUserVote && <div className="mt-3 text-xs text-green-400">✅ Your vote</div>}
                  {!isUserVote && isSelected && <div className="mt-3 text-xs text-cyan-400">✨ Selected</div>}
                  {!isUserVote && hasVoted && <div className="mt-3 text-xs text-gray-500">Already voted</div>}
                  {!hasVoted && isVotingEnded && <div className="mt-3 text-xs text-red-400">Voting ended</div>}
                  {!hasVoted && !isVotingEnded && !isSelected && <div className="mt-3 text-xs text-gray-500">Click to select</div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={handleVote}
            disabled={
              !isConnected || 
              hasVoted || 
              selectedYearIndex === null || 
              isProcessing || 
              !contractInfo || 
              isVotingEnded
            }
            className="px-10 py-5 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-2xl font-bold text-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-3 mx-auto shadow-2xl hover:shadow-cyan-500/30"
          >
            {isProcessing ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : !isConnected ? (
              "🔗 Connect Wallet"
            ) : isVotingEnded ? (
              "⏰ Voting Has Ended"
            ) : hasVoted ? (
              `✅ Voted for ${userVotedYearIndex !== null ? 2015 + userVotedYearIndex : ""}`
            ) : selectedYearIndex !== null ? (
              `🗳️ Vote for ${2015 + selectedYearIndex}`
            ) : (
              "Select a Year"
            )}
          </button>
        </div>
      </div>
    </div>  
  );
}