import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Brain, Sparkles, Trash2, Save, RefreshCcw, FileUser, Plus, CheckCircle2 } from 'lucide-react';

// --- Types ---
interface Skill { id: string; name: string; category: string; description: string; }
interface AgentProfile { id: string; name: string; description: string; }
interface AgentData { agentProfiles: AgentProfile[]; skills: Skill[]; layers: any[]; }
interface SavedAgent { name: string; profileId: string; skillIds: string[]; layerIds: string[]; provider?: string; }

function App() {
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState(0);

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [agentName, setAgentName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>([]);

  // --- 🔥 Performance Optimization: Memoized Selections ---
  const currentProfile = useMemo(() => data?.agentProfiles.find(p => p.id === selectedProfile), [data, selectedProfile]);
  
  const currentSkills = useMemo(() => {
    return selectedSkills
      .map(id => data?.skills.find(s => s.id === id))
      .filter((s): s is Skill => !!s);
  }, [data, selectedSkills]);

  // --- 🌐 API Logic (Clean & Memoized) ---
  const fetchAPI = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/data.json');
      if (!response.ok) throw new Error('Failed to fetch data');
      const jsonData: AgentData = await response.json();
      setData(jsonData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAPI();
    const timer = setInterval(() => setSessionTime(p => p + 1), 1000);
    const saved = localStorage.getItem('savedAgents');
    if (saved) setSavedAgents(JSON.parse(saved));
    return () => clearInterval(timer); // Cleanup: Memory leak fix
  }, [fetchAPI]);

  // --- 🎯 Improved Drag and Drop Logic ---
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Logic for re-ordering inside the pipeline
    if (source.droppableId === 'canvas-skills' && destination.droppableId === 'canvas-skills') {
      const reordered = Array.from(selectedSkills);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      setSelectedSkills(reordered);
      return;
    }

    // Logic for dragging from toolbox to pipeline
    if (source.droppableId === 'skills-list' && destination.droppableId === 'canvas-skills') {
      if (!selectedSkills.includes(draggableId)) {
        const newSkills = Array.from(selectedSkills);
        newSkills.splice(destination.index, 0, draggableId);
        setSelectedSkills(newSkills);
      }
    }
  };

  const handleSave = () => {
    if (!agentName) return alert("Please provide an Agent Name!");
    const newAgent = { name: agentName, profileId: selectedProfile, skillIds: selectedSkills, layerIds: [], provider: selectedProvider };
    setSavedAgents([...savedAgents, newAgent]);
    localStorage.setItem('savedAgents', JSON.stringify([...savedAgents, newAgent]));
    setAgentName('');
    alert("Agent configuration deployed successfully!");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 lg:p-8">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI Agent Architect</h1>
          <p className="text-slate-500 font-medium tracking-tight">Active session: {sessionTime}s</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.open('/Helal_Uddin_CV.pdf', '_blank')} className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition shadow-sm font-semibold">
            <FileUser size={18} className="text-blue-600" /> View Developer CV
          </button>
          <button onClick={fetchAPI} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-lg font-semibold transition-transform active:scale-95">
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> Sync Data
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600"><Brain size={20}/> Base Profile</h2>
              <select 
                value={selectedProfile} 
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500 cursor-pointer"
              >
                <option value="">Select a Persona...</option>
                {data?.agentProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </section>

            {/* Toolbox: Skills */}
            <Droppable droppableId="skills-list" isDropDisabled={true}>
              {(provided) => (
                <section {...provided.droppableProps} ref={provided.innerRef} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-600"><Sparkles size={20}/> Available Skills</h2>
                  <div className="space-y-2">
                    {data?.skills.map((s, index) => (
                      <Draggable key={`toolbox-${s.id}`} draggableId={s.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} 
                            className={`p-3.5 rounded-xl border flex justify-between items-center group cursor-grab transition-all ${snapshot.isDragging ? 'bg-indigo-50 border-indigo-300 shadow-xl' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'}`}>
                            <span className="font-medium text-slate-700">{s.name}</span>
                            <Plus size={16} className="text-slate-400 group-hover:text-emerald-500" />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </section>
              )}
            </Droppable>
          </div>

          {/* Right Canvas */}
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 min-h-[550px]">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Enter Agent Name..." className="text-3xl font-bold border-none outline-none placeholder-slate-300 bg-transparent w-full" />
                <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl font-bold">
                  <Save size={20}/> Deploy Agent
                </button>
              </div>

              <div className={`mb-8 p-6 rounded-2xl border transition-all ${currentProfile ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-dashed border-slate-300'}`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Active Persona</h3>
                {currentProfile ? (
                  <div><h4 className="text-2xl font-black text-indigo-900">{currentProfile.name}</h4><p className="text-indigo-700/80">{currentProfile.description}</p></div>
                ) : <p className="text-slate-400 italic font-medium">Drag or select a profile to begin...</p>}
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={16}/> Skills Pipeline</h3>
                <Droppable droppableId="canvas-skills" direction="horizontal">
                  {(provided, snapshot) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className={`p-6 rounded-3xl border-2 border-dashed flex flex-wrap gap-3 min-h-[140px] items-center transition-colors ${snapshot.isDraggingOver ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                      {currentSkills.map((s, index) => (
                        <Draggable key={`canvas-${s.id}`} draggableId={s.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} 
                              className="px-4 py-2.5 rounded-xl border bg-white shadow-sm flex items-center gap-3 ring-indigo-500 hover:ring-2 transition-all">
                              <span className="font-bold text-slate-700">{s.name}</span>
                              <button onClick={() => setSelectedSkills(prev => prev.filter(id => id !== s.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">AI Provider Model</h3>
                  <div className="flex gap-3 flex-wrap">
                    {['Gemini', 'ChatGPT', 'Claude', 'Llama 3'].map(p => (
                      <button key={p} onClick={() => setSelectedProvider(p)} className={`px-6 py-2.5 rounded-xl border font-bold transition-all ${selectedProvider === p ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </DragDropContext>
    </div>
  );
}

export default App;