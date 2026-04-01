import { memo } from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { sidebarHighlightTransition } from '../utils/motion';
import {
  HomeHLine,
  Settings02,
  InfoCircle,
  Dock,
  Sun,
  Moon,
} from '../icons';
import appIcon from '../assets/app-icon.png';
// import LoginModal from './LoginModal';

const sidebarItems = [
  { name: '主页', icon: HomeHLine, id: 'home' },
  { name: '常用语', icon: InfoCircle, id: 'phrases' },
  { name: 'AI模型', icon: Settings02, id: 'settings' },
  { name: '日志', icon: Dock, id: 'logs' },
  { name: '关于', icon: InfoCircle, id: 'about' },
];

function Sidebar({ activeItem, setActiveItem, theme, onToggleTheme }) {
  // const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className='h-full flex flex-col bg-[#F9F9F9] dark:bg-zinc-950 transition-colors duration-300'>
      {/* Logo区域 */}
      <div className='px-5 py-5'>
        <div className='flex items-center space-x-2'>
          <div className='rounded-xl flex items-center justify-center overflow-hidden w-[46px] h-[46px] min-w-[46px] border-2 border-white dark:border-zinc-800 transition-colors duration-300'>
            <img
              src={appIcon}
              alt='DeepRant Logo'
              width='46'
              height='46'
              className='object-cover w-[46px] h-[46px]'
            />
          </div>
          <h3 className='text-[18px] font-semibold text-[#1a1a1a] dark:text-white leading-6 transition-colors duration-300'>DeepRant - Via 二开版</h3>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className='flex-1 px-2 py-2'>
        {sidebarItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className='relative'>
              {isActive && (
                <motion.div
                  layoutId='activeTab'
                  className='absolute inset-0 rounded-lg bg-zinc-900 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.08)] dark:bg-white dark:shadow-[0_8px_24px_rgba(0,0,0,0.24)]'
                  initial={false}
                  transition={sidebarHighlightTransition}
                />
              )}
              <div
                className={twMerge(
                  'flex items-center px-3.5 py-2.5 cursor-pointer',
                  'text-[14px] font-medium relative z-10 transition-colors duration-300',
                  isActive
                    ? 'text-white font-semibold dark:text-[#1a1a1a]'
                    : 'text-[#666666] dark:text-zinc-400 hover:text-[#1a1a1a] dark:hover:text-white'
                )}>
                <item.icon
                  className={twMerge(
                    'w-[18px] h-[18px] mr-3',
                    isActive ? 'stroke-white dark:stroke-[#1a1a1a]' : 'stroke-[#666666] dark:stroke-zinc-400'
                  )}
                />
                {item.name}
              </div>
            </div>
          );
        })}
      </nav>

      <div className='px-3 pb-4'>
        <button
          type='button'
          onClick={onToggleTheme}
          title={theme === 'dark' ? '切换到白天模式' : '切换到暗黑模式'}
          className='w-11 h-11 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition-colors duration-300'>
          {theme === 'dark' ? (
            <Moon className='w-[18px] h-[18px] stroke-current' />
          ) : (
            <Sun className='w-[18px] h-[18px] stroke-current' />
          )}
        </button>
      </div>

      {/* 用户信息 */}
      {/* <div className='px-2 pb-3'>
        <div
          className='flex items-center px-3.5 py-2.5 cursor-pointer text-[#666666] hover:text-[#1a1a1a]'
          onClick={() => setIsLoginModalOpen(true)}>
          <UserUser01 className='w-[18px] h-[18px] mr-3 stroke-[#666666]' />
          <span className='text-[14px] font-medium'>未登录</span>
        </div>
      </div> */}

      {/* <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      /> */}
    </div>
  );
}

export default memo(Sidebar);
