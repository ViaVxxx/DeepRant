import { Coffee, AT, Sparkles } from '../icons';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function DeveloperNote() {
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    invoke('get_version')
      .then((version) => {
        setCurrentVersion(version);
      })
      .catch((error) => {
        console.error('获取版本号失败:', error);
      });
  }, []);

  return (
    <div className='flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm'>
      <div className='flex items-center gap-3 text-sm text-zinc-500 mb-6'>
        <Coffee className='w-6 h-6 stroke-zinc-500' />
        开发者说
      </div>

      <div className='flex flex-col gap-4'>
        <div className='text-lg font-medium text-zinc-700 dark:text-zinc-200'>
          此版本为 ViaVxxx 二开维护版
        </div>

        <p className='text-zinc-500 dark:text-zinc-400 leading-relaxed'>
          当前版本基于 DeepRant 做了二次开发，主要补充了常用语管理、自定义 API 接入、模型列表拉取与日志排查等能力，
          面向个人使用与持续迭代维护。
        </p>

        <div className='grid grid-cols-1 gap-3'>
          <div className='flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-500 dark:text-zinc-400'>
            <Sparkles className='w-4 h-4 stroke-zinc-500' />
            基于原项目继续演进，保留核心翻译体验
          </div>
          <div className='flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-500 dark:text-zinc-400'>
            <AT className='w-4 h-4 stroke-zinc-500' />
            当前程序版本：{currentVersion || '加载中...'}
          </div>
        </div>
      </div>
    </div>
  );
}
