import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Player, SkillTier } from '../types';
import { X, Users, Wand2, Plus } from 'lucide-react';
import gsap from 'gsap';
import { generateOptimalMatch } from '../utils/matchmaker';

interface MatchMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MatchMakerModal({ isOpen, onClose }: MatchMakerModalProps) {
  const { user } = useAuth();
  const { players, courts, addMatch } = useAppStore();
  const waitingPlayers = players.filter(p => p.status === 'waiting');
  
  // Local state for drag and drop
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [teamA, setTeamA] = useState<(Player | null)[]>([null, null]);
  const [teamB, setTeamB] = useState<(Player | null)[]>([null, null]);
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setAvailablePlayers(waitingPlayers);
      setTeamA([null, null]);
      setTeamB([null, null]);
      if (courts.length > 0) setSelectedCourt(courts[0].id);
      
      requestAnimationFrame(() => {
        gsap.fromTo('.modal-content', 
          { y: 50, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
      });
    } else if (visible) {
      gsap.to('.modal-content', {
        y: 50, opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: () => setVisible(false),
      });
    }
  }, [isOpen, players]);

  if (!visible) return null;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    const destIndex = result.destination.index;
    
    // Finding the player
    let player: Player | undefined;
    if (sourceId === 'available') {
      player = availablePlayers[result.source.index];
    } else if (sourceId.startsWith('team')) {
      const isTeamA = sourceId.startsWith('teamA');
      const idx = parseInt(sourceId.split('-')[1]);
      player = isTeamA ? teamA[idx] || undefined : teamB[idx] || undefined;
    }

    if (!player) return;

    // Remove from source
    if (sourceId === 'available') {
      const newAvail = Array.from(availablePlayers);
      newAvail.splice(result.source.index, 1);
      setAvailablePlayers(newAvail);
    } else if (sourceId.startsWith('team')) {
      const isTeamA = sourceId.startsWith('teamA');
      const idx = parseInt(sourceId.split('-')[1]);
      if (isTeamA) {
        const newTeamA = [...teamA];
        newTeamA[idx] = null;
        setTeamA(newTeamA);
      } else {
        const newTeamB = [...teamB];
        newTeamB[idx] = null;
        setTeamB(newTeamB);
      }
    }

    // Add to destination
    if (destId === 'available') {
      const newAvail = Array.from(availablePlayers);
      newAvail.splice(result.destination.index, 0, player);
      setAvailablePlayers(newAvail);
    } else if (destId.startsWith('team')) {
      const isTeamA = destId.startsWith('teamA');
      const idx = parseInt(destId.split('-')[1]);
      
      // If there's already a player there, we swap them back to available
      let displacedPlayer = null;
      if (isTeamA) {
        displacedPlayer = teamA[idx];
        const newTeamA = [...teamA];
        newTeamA[idx] = player;
        setTeamA(newTeamA);
      } else {
        displacedPlayer = teamB[idx];
        const newTeamB = [...teamB];
        newTeamB[idx] = player;
        setTeamB(newTeamB);
      }

      if (displacedPlayer) {
        setAvailablePlayers(prev => [...prev, displacedPlayer!]);
      }
    }
  };

  const autoGenerate = () => {
    const selected4 = generateOptimalMatch(availablePlayers);

    if (!selected4) {
      alert("Not enough waiting players to auto-generate a full match.");
      return;
    }
    
    setTeamA([selected4[0], selected4[2]]);
    setTeamB([selected4[1], selected4[3]]);
    
    const selectedIds = new Set(selected4.map(p => p.id));
    setAvailablePlayers(availablePlayers.filter(p => !selectedIds.has(p.id)));
    
    gsap.fromTo('.team-slot', 
      { scale: 0.9, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 0.3, stagger: 0.1, ease: 'back.out(1.5)' }
    );
  };

  const startMatch = async () => {
    const validTeamA = teamA.filter(Boolean) as Player[];
    const validTeamB = teamB.filter(Boolean) as Player[];
    
    if (validTeamA.length !== 2 || validTeamB.length !== 2) {
      alert("Each team needs exactly two players.");
      return;
    }
    if (!selectedCourt) {
      alert("Please select a court.");
      return;
    }
    if (!user) return;

    try {
      await addMatch(user.uid, {
        teamA: validTeamA.map(p => p.id),
        teamB: validTeamB.map(p => p.id),
        courtId: selectedCourt,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to queue this match.');
      return;
    }
    
    gsap.to('.modal-content', { 
      y: 50, opacity: 0, duration: 0.3, 
      onComplete: () => {
        setVisible(false);
        onClose();
      }
    });
  };

  const closeWithAnim = () => {
    gsap.to('.modal-content', { 
      y: 50, opacity: 0, duration: 0.3, 
      onComplete: () => {
        setVisible(false);
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="modal-content w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Match Maker
          </h2>
          <button onClick={closeWithAnim} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
            
            {/* Sidebar: Waiting Players */}
            <div className="w-full md:w-1/3 border-r-0 md:border-r border-b md:border-b-0 border-slate-800 flex flex-col min-h-[40vh] md:min-h-0">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-300">Waiting ({availablePlayers.length})</h3>
                <button 
                  onClick={autoGenerate}
                  className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors"
                >
                  <Wand2 className="w-3 h-3" /> Auto
                </button>
              </div>
              <Droppable droppableId="available">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-2"
                  >
                    {availablePlayers.map((player, index) => (
                      <Draggable key={player.id} draggableId={player.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 rounded-xl border ${
                              snapshot.isDragging ? 'bg-slate-700 border-emerald-500 shadow-lg' : 'bg-slate-800 border-slate-700'
                            } flex justify-between items-center`}
                          >
                            <span className="font-medium text-slate-200">{player.name}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded">
                              {player.tier.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Main Area: Court Slots */}
            <div className="flex-1 p-6 flex flex-col bg-slate-950">
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-200">Court Assignment</h3>
                <select 
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                >
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex flex-col md:flex-row gap-6 relative justify-center items-center">
                {/* Team A */}
                <div className="flex-1 flex flex-col gap-4 w-full">
                  <h4 className="text-center text-sm font-bold text-emerald-400 uppercase tracking-widest">Team A</h4>
                  {[0, 1].map(slotIdx => (
                    <Droppable key={`teamA-${slotIdx}`} droppableId={`teamA-${slotIdx}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`team-slot h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
                            snapshot.isDraggingOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700'
                          }`}
                        >
                          {teamA[slotIdx] ? (
                            <Draggable draggableId={teamA[slotIdx]!.id} index={0}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`w-full h-full p-4 rounded-xl flex items-center justify-between ${
                                    snapshot.isDragging ? 'bg-slate-700' : 'bg-slate-800'
                                  }`}
                                >
                                  <span className="font-bold text-white text-lg">{teamA[slotIdx]!.name}</span>
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            <span className="text-slate-500 text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Drop Player</span>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>

                <div className="text-slate-600 font-black text-2xl italic px-4">VS</div>

                {/* Team B */}
                <div className="flex-1 flex flex-col gap-4 w-full">
                  <h4 className="text-center text-sm font-bold text-teal-400 uppercase tracking-widest">Team B</h4>
                  {[0, 1].map(slotIdx => (
                    <Droppable key={`teamB-${slotIdx}`} droppableId={`teamB-${slotIdx}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`team-slot h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
                            snapshot.isDraggingOver ? 'border-teal-500 bg-teal-500/10' : 'border-slate-700'
                          }`}
                        >
                          {teamB[slotIdx] ? (
                            <Draggable draggableId={teamB[slotIdx]!.id} index={0}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`w-full h-full p-4 rounded-xl flex items-center justify-between ${
                                    snapshot.isDragging ? 'bg-slate-700' : 'bg-slate-800'
                                  }`}
                                >
                                  <span className="font-bold text-white text-lg">{teamB[slotIdx]!.name}</span>
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            <span className="text-slate-500 text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Drop Player</span>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="mt-8">
                <button
                  onClick={startMatch}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-lg flex items-center justify-center gap-2"
                >
                  Add to Match Queue
                </button>
              </div>
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
