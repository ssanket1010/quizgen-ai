import React, { useState, useEffect } from 'react';
import { Quiz, QuestionType, QuizAttempt } from '../types';
import { Button } from './Button';
import { Check, X, ArrowRight, ArrowLeft, RefreshCw, Home } from 'lucide-react';
import clsx from 'clsx';

interface QuizViewProps {
  quiz: Quiz;
  onComplete: (attempt: QuizAttempt) => void;
  onExit: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ quiz, onComplete, onExit }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Reset state when quiz changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowFeedback(false);
    setIsFinished(false);
  }, [quiz.id]);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  const handleAnswer = (answer: string) => {
    if (showFeedback || isFinished) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));

    // Auto-advance for selection-based questions (MCQ & True/False)
    if (
      (currentQuestion.type === QuestionType.MULTIPLE_CHOICE || 
       currentQuestion.type === QuestionType.TRUE_FALSE) &&
      !isLastQuestion
    ) {
      // Add a small delay for better UX (so user sees their selection)
      const timer = setTimeout(() => {
        // Ensure we haven't already moved (in case of rapid clicks or manual nav)
        setCurrentQuestionIndex(prevIndex => {
            if (prevIndex === currentQuestionIndex) {
                return prevIndex + 1;
            }
            return prevIndex;
        });
        setShowFeedback(false);
      }, 700);
      
      return () => clearTimeout(timer);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      finishQuiz();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowFeedback(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowFeedback(false);
    }
  };

  const finishQuiz = () => {
    setIsFinished(true);
    let score = 0;
    quiz.questions.forEach(q => {
      // Simple case-insensitive comparison
      if (answers[q.id]?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) {
        score++;
      }
    });

    onComplete({
      answers,
      isSubmitted: true,
      score
    });
  };

  const getScore = () => {
    let score = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id]?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) {
        score++;
      }
    });
    return score;
  };

  if (isFinished) {
    const score = getScore();
    const percentage = Math.round((score / quiz.questions.length) * 100);
    
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
            <p className="opacity-90">{quiz.title}</p>
            <div className="mt-6 flex justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 text-4xl font-bold">
                {percentage}%
              </div>
            </div>
            <p className="mt-4 text-xl">You scored {score} out of {quiz.questions.length}</p>
          </div>

          <div className="p-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Review Answers</h3>
            
            {quiz.questions.map((q, idx) => {
              const userAnswer = answers[q.id] || "No answer";
              const isCorrect = userAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
              
              return (
                <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 min-w-[24px] h-6 rounded-full flex items-center justify-center text-white text-sm ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 mb-2">{q.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className={clsx("p-2 rounded", isCorrect ? "text-green-800" : "text-red-800 font-semibold")}>
                          Your Answer: <span className="font-medium">{userAnswer}</span>
                        </div>
                        <div className="text-slate-600 p-2">
                          Correct Answer: <span className="font-medium">{q.correctAnswer}</span>
                        </div>
                      </div>
                      {!isCorrect && (
                        <div className="mt-2 text-sm text-slate-500 italic border-t border-slate-200/50 pt-2">
                          Explanation: {q.explanation}
                        </div>
                      )}
                    </div>
                    {isCorrect ? <Check className="text-green-500" /> : <X className="text-red-500" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
             <Button variant="outline" onClick={onExit} className="flex items-center">
               <Home className="mr-2 h-4 w-4" /> Back to Dashboard
             </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onExit} className="!p-2">
            <Home size={18} />
          </Button>
          <div>
            <h2 className="font-bold text-slate-800">{quiz.title}</h2>
            <p className="text-xs text-slate-500">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
          </div>
        </div>
        <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 min-h-[400px] flex flex-col animate-fade-in-up">
        <div className="mb-8">
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold mb-4">
            {currentQuestion.type.replace('_', ' ')}
          </span>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-900 leading-relaxed">
            {currentQuestion.question}
          </h3>
        </div>

        <div className="flex-1 space-y-3">
          {currentQuestion.type === QuestionType.MULTIPLE_CHOICE && currentQuestion.options?.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              className={clsx(
                "w-full p-4 text-left rounded-xl border-2 transition-all duration-200 group flex items-center",
                answers[currentQuestion.id] === option 
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md transform scale-[1.01]" 
                  : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700 hover:shadow-sm"
              )}
            >
              <div className={clsx(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 text-xs font-bold transition-colors",
                answers[currentQuestion.id] === option 
                  ? "border-indigo-600 bg-indigo-600 text-white" 
                  : "border-slate-300 text-slate-400 group-hover:border-indigo-400"
              )}>
                {String.fromCharCode(65 + idx)}
              </div>
              {option}
            </button>
          ))}

          {currentQuestion.type === QuestionType.TRUE_FALSE && (
            <div className="grid grid-cols-2 gap-4">
              {['True', 'False'].map((option) => (
                 <button
                 key={option}
                 onClick={() => handleAnswer(option)}
                 className={clsx(
                   "p-6 text-center rounded-xl border-2 transition-all duration-200 font-medium text-lg",
                   answers[currentQuestion.id] === option 
                     ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md transform scale-[1.01]" 
                     : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700 hover:shadow-sm"
                 )}
               >
                 {option}
               </button>
              ))}
            </div>
          )}

          {currentQuestion.type === QuestionType.SHORT_ANSWER && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Type your answer here..."
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
              />
              <p className="text-sm text-slate-500">
                Your answer will be compared to the model's key.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious} 
          disabled={currentQuestionIndex === 0}
          className="w-32"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        
        <Button 
          variant="primary" 
          onClick={handleNext} 
          disabled={!answers[currentQuestion.id]}
          className="w-32"
        >
          {isLastQuestion ? 'Finish' : 'Next'} 
          {!isLastQuestion && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};