import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        {
            name: 'Dashboard',
            path: '/app',
            icon: LayoutDashboard,
        },
        {
            name: 'New Structure',
            path: '/app/forms/new',
            icon: PlusCircle,
        },
    ];

    return (
        <aside className="w-64 border-r border-[#1a1a1a] bg-[#f5f5f0] flex flex-col shrink-0 h-full">
            <div className="border-b border-[#1a1a1a] px-6 py-8">
                <div className="font-crimson text-[32px] leading-none">RAG FORMS</div>
                <div className="mt-2 text-[8px] uppercase tracking-[2.4px] text-[#4a4a4a]">System Core v4.0.2</div>
            </div>
            <div className="flex-1 px-6 py-8 text-[10px] uppercase tracking-[2px]">
                <nav className="flex flex-col gap-3">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 font-semibold transition-all duration-200 ${
                                    isActive
                                        ? 'border border-[#1a1a1a] bg-[#1a1a1a] text-[#f5f5f0]'
                                        : 'text-[#4a4a4a] hover:bg-[#1a1a1a]/5'
                                }`}
                            >
                                <item.icon className="h-3.5 w-3.5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-[#1a1a1a] px-6 py-8 text-[9px] uppercase tracking-[0.9px] text-[#4a4a4a]">
                <div>Status: Secure</div>
                <div>Node: Stark_01</div>
            </div>
        </aside>
    );
};

export default Sidebar;
