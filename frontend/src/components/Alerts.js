import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

const Alerts = {
  success: (message) => {
    toast(
      <div className="flex items-center">
        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-green-50 text-green-800',
        progressClassName: 'bg-green-500',
        icon: false,
      }
    );
  },

  error: (message) => {
    toast(
      <div className="flex items-center">
        <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-red-50 text-red-800',
        progressClassName: 'bg-red-500',
        icon: false,
      }
    );
  },

  warning: (message) => {
    toast(
      <div className="flex items-center">
        <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-yellow-50 text-yellow-800',
        progressClassName: 'bg-yellow-500',
        icon: false,
      }
    );
  },

  info: (message) => {
    toast(
      <div className="flex items-center">
        <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-blue-50 text-blue-800',
        progressClassName: 'bg-blue-500',
        icon: false,
      }
    );
  },
};

const DeadlinePassedAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [expanded, setExpanded] = useState(initialExpanded);

  const passedDeadlineCount = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    
    const endDateMatch = note.content.match(/meta::end_date::(\d{4}-\d{2}-\d{2})/);
    if (!endDateMatch) return false;
    
    const endDate = new Date(endDateMatch[1]);
    const now = new Date();
    return endDate < now;
  }).length;

  if (passedDeadlineCount === 0) return null;

  return (
    <div className="mb-4">
      <div 
        className="flex items-center justify-between bg-rose-50 p-2 rounded-t-lg cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <svg className="h-5 w-5 text-rose-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-rose-800">
            Deadline passed: {passedDeadlineCount} {passedDeadlineCount === 1 ? 'todo' : 'todos'}
          </span>
        </div>
        <button className="text-rose-600 hover:text-rose-800">
          <svg 
            className={`h-5 w-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {expanded && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="mt-2 text-sm text-rose-700">
                <ul className="list-disc pl-5 space-y-1">
                  {notes
                    .filter(note => {
                      const content = note.content;
                      const hasTodo = content.includes('meta::todo');
                      if (!hasTodo) return false;
                      
                      const endDateMatch = content.match(/meta::end_date::(\d{4}-\d{2}-\d{2})/);
                      if (!endDateMatch) return false;
                      
                      const endDate = new Date(endDateMatch[1]);
                      const now = new Date();
                      return endDate < now;
                    })
                    .map(note => (
                      <li key={note.id}>
                        {note.content.split('\n').filter(line => !line.trim().startsWith('meta::')).join(' ').slice(0, 100)}
                        {note.content.length > 100 ? '...' : ''}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AlertsProvider = ({ children, notes, expanded = true }) => {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <DeadlinePassedAlert notes={notes} expanded={expanded} />
      {children}
    </>
  );
};

export { Alerts, AlertsProvider }; 