/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Hand, 
  Cpu, 
  Info, 
  ChevronRight,
  Heart,
  Diamond,
  Club,
  Spade,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types & Constants ---

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

const SUIT_ICONS = {
  hearts: <Heart className="text-red-500 fill-red-500" />,
  diamonds: <Diamond className="text-red-500 fill-red-500" />,
  clubs: <Club className="text-slate-900 fill-slate-900" />,
  spades: <Spade className="text-slate-900 fill-slate-900" />,
};

// --- Utils ---

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}-${Math.random()}`,
        suit,
        rank,
        value: RANK_VALUES[rank]
      });
    });
  });
  return deck;
};

const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// --- Components ---

interface PlayingCardProps {
  card: Card;
  hidden?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  index?: number;
  total?: number;
  key?: React.Key;
}

const PlayingCard = ({ 
  card, 
  hidden = false, 
  onClick, 
  isPlayable = false,
  index = 0,
  total = 1
}: PlayingCardProps) => {
  // Calculate fan effect for hand
  const rotation = total > 1 ? (index - (total - 1) / 2) * 5 : 0;
  const xOffset = total > 1 ? (index - (total - 1) / 2) * 30 : 0;

  return (
    <motion.div
      layoutId={card.id}
      initial={{ scale: 0.8, opacity: 0, y: 50 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0,
        rotate: rotation,
        x: xOffset,
        zIndex: index
      }}
      whileHover={!hidden ? { y: -20, scale: 1.05, zIndex: 50 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative w-24 h-36 sm:w-28 sm:h-40 rounded-xl border-2 card-shadow cursor-pointer select-none
        ${hidden ? 'bg-blue-800 border-blue-600' : 'bg-white border-slate-200'}
        ${isPlayable ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-green-800' : ''}
        transition-shadow duration-200
      `}
    >
      {hidden ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-24 border-2 border-blue-400/30 rounded-lg flex items-center justify-center">
             <div className="text-blue-400/20 font-bold text-4xl">8</div>
          </div>
        </div>
      ) : (
        <div className="p-2 h-full flex flex-col justify-between">
          <div className="flex flex-col items-start">
            <span className={`text-lg font-bold leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-slate-900'}`}>
              {card.rank}
            </span>
            <div className="w-4 h-4 mt-0.5">
              {SUIT_ICONS[card.suit]}
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="w-8 h-8 opacity-20">
              {SUIT_ICONS[card.suit]}
            </div>
          </div>

          <div className="flex flex-col items-end rotate-180">
            <span className={`text-lg font-bold leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-slate-900'}`}>
              {card.rank}
            </span>
            <div className="w-4 h-4 mt-0.5">
              {SUIT_ICONS[card.suit]}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentSuit, setCurrentSuit] = useState<Suit | null>(null);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [isPickingSuit, setIsPickingSuit] = useState(false);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost' | 'draw'>('idle');
  const [message, setMessage] = useState('欢迎来到疯狂8点！');
  const [lastAction, setLastAction] = useState<string>('');

  // --- Game Initialization ---

  const startGame = useCallback(() => {
    const fullDeck = shuffle(createDeck());
    const pHand = fullDeck.splice(0, 8);
    const aHand = fullDeck.splice(0, 8);
    const initialDiscard = fullDeck.splice(0, 1)[0];
    
    setDeck(fullDeck);
    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([initialDiscard]);
    setCurrentSuit(initialDiscard.suit);
    setTurn('player');
    setGameStatus('playing');
    setIsPickingSuit(false);
    setMessage('你的回合！出牌或摸牌。');
    setLastAction('');
  }, []);

  // --- Game Actions ---

  const topCard = discardPile[discardPile.length - 1];

  const isCardPlayable = useCallback((card: Card) => {
    if (card.rank === '8') return true;
    return card.suit === currentSuit || card.rank === topCard.rank;
  }, [currentSuit, topCard]);

  const playCard = (card: Card, isPlayer: boolean) => {
    if (isPlayer) {
      setPlayerHand(prev => prev.filter(c => c.id !== card.id));
    } else {
      setAiHand(prev => prev.filter(c => c.id !== card.id));
    }

    setDiscardPile(prev => [...prev, card]);
    
    if (card.rank === '8') {
      if (isPlayer) {
        setIsPickingSuit(true);
        setMessage('打出了 8！请选择一个新的花色。');
      } else {
        // AI picks a suit (the one it has most of)
        const suitsInHand = aiHand.filter(c => c.id !== card.id).map(c => c.suit);
        const mostCommonSuit = SUITS.reduce((a, b) => 
          suitsInHand.filter(s => s === a).length >= suitsInHand.filter(s => s === b).length ? a : b
        );
        setCurrentSuit(mostCommonSuit);
        setLastAction(`AI 打出了 8，并将花色改为 ${mostCommonSuit === 'hearts' ? '红心' : mostCommonSuit === 'diamonds' ? '方块' : mostCommonSuit === 'clubs' ? '梅花' : '黑桃'}`);
        setTurn('player');
      }
    } else {
      setCurrentSuit(card.suit);
      setTurn(isPlayer ? 'ai' : 'player');
      if (!isPlayer) {
        setLastAction(`AI 打出了 ${card.rank} of ${card.suit}`);
      }
    }
  };

  const drawCard = (isPlayer: boolean) => {
    if (deck.length === 0) {
      setMessage('摸牌堆已空！跳过回合。');
      setTurn(isPlayer ? 'ai' : 'player');
      return;
    }

    const newDeck = [...deck];
    const drawnCard = newDeck.pop()!;
    setDeck(newDeck);

    if (isPlayer) {
      setPlayerHand(prev => [...prev, drawnCard]);
      setTurn('ai');
      setLastAction('你摸了一张牌');
    } else {
      setAiHand(prev => [...prev, drawnCard]);
      setTurn('player');
      setLastAction('AI 摸了一张牌');
    }
  };

  // --- AI Logic ---

  useEffect(() => {
    if (turn === 'ai' && gameStatus === 'playing') {
      const timer = setTimeout(() => {
        const playableCards = aiHand.filter(isCardPlayable);
        
        if (playableCards.length > 0) {
          // AI Strategy: Prefer non-8 cards first, then 8
          const nonEight = playableCards.find(c => c.rank !== '8');
          if (nonEight) {
            playCard(nonEight, false);
          } else {
            playCard(playableCards[0], false);
          }
        } else {
          drawCard(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, aiHand, gameStatus, currentSuit, topCard]);

  // --- Win Condition ---

  useEffect(() => {
    if (gameStatus === 'playing') {
      if (playerHand.length === 0) {
        setGameStatus('won');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else if (aiHand.length === 0) {
        setGameStatus('lost');
      } else if (deck.length === 0) {
        // Check if both players are stuck
        const playerCanPlay = playerHand.some(isCardPlayable);
        const aiCanPlay = aiHand.some(isCardPlayable);
        if (!playerCanPlay && !aiCanPlay) {
          setGameStatus('draw');
        }
      }
    }
  }, [playerHand, aiHand, gameStatus, deck.length, isCardPlayable]);

  // --- Render Helpers ---

  const handleSuitPick = (suit: Suit) => {
    setCurrentSuit(suit);
    setIsPickingSuit(false);
    setTurn('ai');
    setLastAction(`你打出了 8，并将花色改为 ${suit === 'hearts' ? '红心' : suit === 'diamonds' ? '方块' : suit === 'clubs' ? '梅花' : '黑桃'}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 poker-table relative overflow-hidden">
      
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 rotate-12"><Spade size={120} /></div>
        <div className="absolute bottom-10 right-10 -rotate-12"><Heart size={120} /></div>
      </div>

      {/* Header / Stats */}
      <div className="w-full max-w-4xl flex justify-between items-center z-10">
        <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <div className="p-2 bg-blue-500 rounded-full"><Cpu size={18} /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-60">AI 手牌</p>
            <p className="font-mono font-bold">{aiHand.length} 张</p>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter italic text-yellow-400 drop-shadow-lg">
            CRAZY EIGHTS
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-50">Current Suit:</span>
            {currentSuit && (
              <div className="w-4 h-4 animate-pulse">
                {SUIT_ICONS[currentSuit]}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider opacity-60">你的手牌</p>
            <p className="font-mono font-bold">{playerHand.length} 张</p>
          </div>
          <div className="p-2 bg-emerald-500 rounded-full"><Hand size={18} /></div>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 w-full max-w-5xl flex flex-col justify-center items-center gap-12 relative">
        
        {/* AI Hand */}
        <div className="flex justify-center -space-x-12 sm:-space-x-16 h-24">
          <AnimatePresence>
            {aiHand.map((card, i) => (
              <PlayingCard key={card.id} card={card} hidden index={i} total={aiHand.length} />
            ))}
          </AnimatePresence>
        </div>

        {/* Center Table */}
        <div className="flex items-center gap-8 sm:gap-16">
          {/* Draw Pile */}
          <div className="relative group">
            <div 
              onClick={turn === 'player' && gameStatus === 'playing' ? () => drawCard(true) : undefined}
              className={`
                w-24 h-36 sm:w-28 sm:h-40 rounded-xl border-2 border-blue-600 bg-blue-800 card-shadow cursor-pointer
                ${turn === 'player' ? 'hover:scale-105 hover:-translate-y-2 transition-transform' : 'opacity-80'}
                flex items-center justify-center relative
              `}
            >
              <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                {deck.length}
              </div>
              <div className="w-16 h-24 border-2 border-blue-400/30 rounded-lg flex items-center justify-center">
                <RotateCcw className="text-blue-400/40" />
              </div>
            </div>
            {turn === 'player' && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-yellow-400 font-bold whitespace-nowrap animate-bounce">
                点击摸牌
              </div>
            )}
          </div>

          {/* Discard Pile */}
          <div className="relative">
            <AnimatePresence mode="popLayout">
              {discardPile.slice(-3).map((card, i) => (
                <div 
                  key={card.id} 
                  className="absolute top-0 left-0"
                  style={{ 
                    transform: `rotate(${(i - 1) * 5}deg) translate(${i * 2}px, ${i * 2}px)`,
                    zIndex: i 
                  }}
                >
                  <PlayingCard card={card} />
                </div>
              ))}
            </AnimatePresence>
            {/* Placeholder to maintain space */}
            <div className="w-24 h-36 sm:w-28 sm:h-40 opacity-0" />
            
            {/* Current Suit Indicator on Table */}
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm p-3 rounded-full border border-white/20">
               {currentSuit && SUIT_ICONS[currentSuit]}
            </div>
          </div>
        </div>

        {/* Player Hand */}
        <div className="flex justify-center -space-x-12 sm:-space-x-16 h-40">
          <AnimatePresence>
            {playerHand.map((card, i) => (
              <PlayingCard 
                key={card.id} 
                card={card} 
                index={i} 
                total={playerHand.length}
                isPlayable={turn === 'player' && gameStatus === 'playing' && isCardPlayable(card)}
                onClick={() => playCard(card, true)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Action Message Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full text-center">
           <AnimatePresence mode="wait">
             {lastAction && (
               <motion.p
                 key={lastAction}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="text-sm font-medium text-white/40 uppercase tracking-[0.3em]"
               >
                 {lastAction}
               </motion.p>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Footer / Controls */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-4">
          <div className={`
            px-6 py-2 rounded-full border flex items-center gap-3 transition-all duration-500
            ${turn === 'player' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}
          `}>
            {turn === 'player' ? <Hand size={16} /> : <Cpu size={16} />}
            <span className="text-xs font-bold uppercase tracking-widest">
              {turn === 'player' ? '你的回合' : 'AI 思考中...'}
            </span>
          </div>
          
          <p className="text-sm text-white/60 italic font-serif">
            "{message}"
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={startGame}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-yellow-400 transition-colors"
          >
            <RotateCcw size={14} />
            {gameStatus === 'idle' ? '开始游戏' : '重新开始'}
          </button>
        </div>
      </div>

      {/* Modals & Overlays */}

      {/* Suit Picker */}
      <AnimatePresence>
        {isPickingSuit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center"
            >
              <h2 className="text-2xl font-bold mb-2 text-yellow-400">选择新花色</h2>
              <p className="text-white/60 text-sm mb-8">你打出了 8！现在你可以改变当前的花色。</p>
              
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleSuitPick(suit)}
                    className="flex flex-col items-center gap-3 p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/30 transition-all group"
                  >
                    <div className="scale-150 group-hover:scale-175 transition-transform">
                      {SUIT_ICONS[suit]}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                      {suit === 'hearts' ? '红心' : suit === 'diamonds' ? '方块' : suit === 'clubs' ? '梅花' : '黑桃'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className={`
                w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center
                ${gameStatus === 'won' ? 'bg-yellow-400 text-black' : gameStatus === 'lost' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'}
              `}>
                {gameStatus === 'won' ? <Trophy size={48} /> : gameStatus === 'lost' ? <AlertCircle size={48} /> : <Info size={48} />}
              </div>
              
              <h2 className="text-5xl font-black italic tracking-tighter mb-2">
                {gameStatus === 'won' ? 'YOU WIN!' : gameStatus === 'lost' ? 'GAME OVER' : 'DRAW GAME'}
              </h2>
              <p className="text-white/50 uppercase tracking-[0.4em] text-sm mb-12">
                {gameStatus === 'won' ? '你清空了所有手牌！' : gameStatus === 'lost' ? 'AI 抢先一步清空了手牌。' : '摸牌堆已空且双方无牌可出。'}
              </p>
              
              <button 
                onClick={startGame}
                className="px-12 py-4 bg-white text-black rounded-full font-black text-lg uppercase tracking-widest hover:bg-yellow-400 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle / Start Screen */}
      <AnimatePresence>
        {gameStatus === 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <div className="max-w-2xl w-full bg-slate-900 border border-white/10 p-8 sm:p-12 rounded-[3rem] shadow-2xl text-center relative overflow-hidden">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

              <h2 className="text-4xl sm:text-6xl font-black italic tracking-tighter text-white mb-6">
                CRAZY <span className="text-yellow-400">EIGHTS</span>
              </h2>
              
              <div className="space-y-4 text-left mb-12 bg-white/5 p-6 rounded-2xl border border-white/5">
                <div className="flex gap-3">
                  <div className="mt-1"><ChevronRight size={16} className="text-yellow-400" /></div>
                  <p className="text-sm text-white/70">每人初始 8 张牌，匹配花色或点数出牌。</p>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1"><ChevronRight size={16} className="text-yellow-400" /></div>
                  <p className="text-sm text-white/70">数字 <span className="text-yellow-400 font-bold">8</span> 是万能牌，可以随时打出并改变花色。</p>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1"><ChevronRight size={16} className="text-yellow-400" /></div>
                  <p className="text-sm text-white/70">无牌可出时必须摸一张牌。</p>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1"><ChevronRight size={16} className="text-yellow-400" /></div>
                  <p className="text-sm text-white/70">最先清空手牌者获胜！</p>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="group relative px-12 py-5 bg-white text-black rounded-full font-black text-xl uppercase tracking-widest hover:bg-yellow-400 transition-all active:scale-95"
              >
                <span className="relative z-10">开始挑战 AI</span>
                <div className="absolute inset-0 bg-yellow-400 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 -z-0" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
