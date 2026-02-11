import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Button } from './components/Button';
import { QuizView } from './components/QuizView';
import { parseFile } from './services/fileParser';
import { generateQuizFromContent } from './services/geminiService';
import { AppState, GenerationConfig, Quiz, QuizAttempt, Question } from './types';
import { BrainCircuit, BookOpen, Clock, Trash2, PlayCircle, Plus, Shuffle, Trophy, X } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState>('DASHBOARD');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  
  // Quiz Preview Modal State
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  
  // Generation State
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<Omit<GenerationConfig, 'file'>>({
    questionCount: 5,
    difficulty: 'Medium'
  });
  const [error, setError] = useState<string | null>(null);

  // Load quizzes from local storage on mount
  useEffect(() => {
    const savedQuizzes = localStorage.getItem('quizgen_quizzes');
    if (savedQuizzes) {
      try {
        setQuizzes(JSON.parse(savedQuizzes));
      } catch (e) {
        console.error("Failed to load quizzes");
      }
    }
  }, []);

  // Save quizzes to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('quizgen_quizzes', JSON.stringify(quizzes));
  }, [quizzes]);

  const handleGenerate = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Parsing
      const content = await parseFile(file);
      
      // 2. Generation
      const generatedData = await generateQuizFromContent(content, {
        ...generationConfig,
        file
      });

      const newQuiz: Quiz = {
        id: Date.now().toString(),
        title: generatedData.title,
        sourceFileName: file.name,
        createdAt: Date.now(),
        questions: generatedData.questions,
        totalQuestions: generatedData.questions.length
      };

      setQuizzes(prev => [newQuiz, ...prev]);
      setCurrentQuiz(newQuiz);
      setAppState('TAKING_QUIZ');
      setFile(null); // Reset file
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteQuiz = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuizzes(prev => prev.filter(q => q.id !== id));
    if (previewQuiz?.id === id) setPreviewQuiz(null);
  };

  const openQuizPreview = (quiz: Quiz) => {
    setPreviewQuiz(quiz);
  };

  const startQuiz = (quiz: Quiz, randomize: boolean = false) => {
    let quizToStart = { ...quiz };
    
    if (randomize) {
      // Fisher-Yates shuffle
      const shuffledQuestions = [...quiz.questions];
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
      }
      quizToStart.questions = shuffledQuestions;
    }

    setCurrentQuiz(quizToStart);
    setPreviewQuiz(null);
    setAppState('TAKING_QUIZ');
  };

  const handleQuizComplete = (attempt: QuizAttempt) => {
    if (!currentQuiz) return;
    
    // Update the last score in the main quiz list (find by ID matches the original quiz ID)
    setQuizzes(prev => prev.map(q => 
      q.id === currentQuiz.id ? { ...q, score: attempt.score } : q
    ));
    
    // Stay in quiz view (it handles the results display)
  };

  const renderQuizPreviewModal = () => {
    if (!previewQuiz) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
          <div className="bg-indigo-600 p-6 text-white relative">
            <button 
              onClick={() => setPreviewQuiz(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold pr-8">{previewQuiz.title}</h3>
            <p className="text-indigo-100 text-sm mt-1">{previewQuiz.sourceFileName}</p>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-center flex-1 border-r border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Questions</p>
                <p className="text-2xl font-bold text-slate-800">{previewQuiz.totalQuestions}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Best Score</p>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-indigo-600">
                  {previewQuiz.score !== undefined ? previewQuiz.score : '-'}
                  {previewQuiz.score !== undefined && <Trophy size={18} className="text-yellow-500" />}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => startQuiz(previewQuiz, false)} 
                className="w-full justify-between group h-12 text-lg"
              >
                <span>Start Quiz</span>
                <PlayCircle size={20} className="opacity-70 group-hover:opacity-100 transition-opacity" />
              </Button>
              
              <Button 
                onClick={() => startQuiz(previewQuiz, true)} 
                variant="secondary"
                className="w-full justify-between group h-12 text-lg"
              >
                <span>Randomize & Start</span>
                <Shuffle size={20} className="opacity-70 group-hover:opacity-100 transition-opacity" />
              </Button>
              
              <div className="pt-4 mt-4 border-t border-slate-100">
                <Button 
                  onClick={() => deleteQuiz(previewQuiz.id)}
                  variant="danger"
                  className="w-full justify-center !py-2 text-sm bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 !shadow-none"
                >
                  <Trash2 size={16} className="mr-2" /> Delete Quiz
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          QuizGen <span className="text-indigo-600">AI</span>
        </h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">
          Transform your notes into quizzes instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Creator Column (Left) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center">
              <Plus className="mr-2 text-indigo-600" size={20} /> New Quiz
            </h2>
            
            <div className="space-y-5">
              <FileUpload 
                selectedFile={file} 
                onFileSelect={setFile} 
                onClear={() => setFile(null)} 
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Questions</label>
                  <select 
                    value={generationConfig.questionCount}
                    onChange={(e) => setGenerationConfig(prev => ({...prev, questionCount: Number(e.target.value)}))}
                    className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Difficulty</label>
                  <select 
                    value={generationConfig.difficulty}
                    onChange={(e) => setGenerationConfig(prev => ({...prev, difficulty: e.target.value as any}))}
                    className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start">
                   <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              <Button 
                className="w-full py-3 text-base shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transform hover:-translate-y-0.5 transition-all" 
                onClick={handleGenerate} 
                disabled={!file}
                isLoading={isProcessing}
              >
                Generate Quiz
              </Button>
            </div>
          </div>
        </div>

        {/* Library Column (Right - expanded) */}
        <div className="lg:col-span-8">
           <div className="flex items-center justify-between mb-5">
             <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <BookOpen className="mr-2 text-indigo-600" size={20} /> Your Library
             </h2>
             <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{quizzes.length} Quizzes</span>
           </div>
           
           {quizzes.length === 0 ? (
             <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
               <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                 <Clock size={32} className="text-slate-300" />
               </div>
               <h3 className="text-lg font-medium text-slate-900 mb-1">Your library is empty</h3>
               <p className="text-slate-500 max-w-xs mx-auto">Upload a document or take a photo to generate your first quiz.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
               {quizzes.map((quiz) => (
                 <div 
                    key={quiz.id} 
                    className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative flex flex-col justify-between min-h-[140px]"
                    onClick={() => openQuizPreview(quiz)}
                 >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-800 line-clamp-2 pr-6 text-lg leading-tight">{quiz.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 flex items-center">
                        <span className="truncate max-w-[180px] font-medium text-slate-600">{quiz.sourceFileName}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center space-x-3 text-sm">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold border border-slate-200">
                          {quiz.totalQuestions} Qs
                        </span>
                        {quiz.score !== undefined ? (
                          <span className="text-green-600 text-xs font-bold flex items-center">
                            <Trophy size={12} className="mr-1" /> {Math.round((quiz.score / quiz.totalQuestions) * 100)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Not taken</span>
                        )}
                      </div>
                      <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                         <PlayCircle size={24} />
                      </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
      
      {renderQuizPreviewModal()}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => setAppState('DASHBOARD')}>
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors">
              <BrainCircuit className="text-white" size={20} />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">QuizGen AI</span>
          </div>
          {appState !== 'DASHBOARD' && (
             <Button variant="outline" onClick={() => setAppState('DASHBOARD')} className="!py-1.5 !px-3 text-sm h-9">
                Exit Quiz
             </Button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-20">
        {appState === 'DASHBOARD' && renderDashboard()}
        
        {appState === 'TAKING_QUIZ' && currentQuiz && (
          <div className="py-6 md:py-10 px-4">
            <QuizView 
              quiz={currentQuiz} 
              onComplete={handleQuizComplete}
              onExit={() => setAppState('DASHBOARD')}
            />
          </div>
        )}
      </main>
    </div>
  );
}
