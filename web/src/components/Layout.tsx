import React from 'react';
import { BarChart } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow">
                <div className="w-full max-w-7xl mx-auto py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <BarChart className="h-7 w-7 mr-2 text-blue-500" />
                            Transaction Analyzer
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 sm:mt-0">
                            Upload your transaction data and gain insights
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-grow py-6">
                {children}
            </main>

            <footer className="bg-white border-t mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-sm text-center text-gray-500">
                        Transaction Analyzer © {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div >
    );
};

export default Layout; 
