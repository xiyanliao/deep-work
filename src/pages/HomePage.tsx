import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NewTaskForm from '../components/NewTaskForm'
import RecommendModal from '../components/RecommendModal'
import TaskList from '../components/TaskList'
import { listTasks, markDone } from '../data/db'
import type { Task } from '../types'
import { useFocusSession } from '../state/FocusSessionContext'
import { useTimePreference } from '../hooks/useTimePreference'
import { recommendTasks } from '../utils/recommendation'
import { useTodayDeepMinutes } from '../hooks/useTodayDeepMinutes'
import { useDurationFormat } from '../state/DurationFormatContext'

const CATEGORY_TABS = [
  { key: 'work', label: '任务' },
  { key: 'leisure', label: '娱乐' },
] as const

type CategoryKey = (typeof CATEGORY_TABS)[number]['key']

function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRecommendOpen, setRecommendOpen] = useState(false)
  const [recommendation, setRecommendation] =
    useState<ReturnType<typeof recommendTasks> | null>(null)
  const [creationTab, setCreationTab] = useState<CategoryKey>('work')
  const [listTab, setListTab] = useState<CategoryKey>('work')
  const navigate = useNavigate()
  const { startFocus, session, focusingTask, isBusy } = useFocusSession()
  const { timePreference, customMinutes, savePreference } = useTimePreference()
  const {
    minutes: todayMinutes,
    isLoading: isTodayLoading,
    error: todayError,
    refresh: refreshTodayMinutes,
  } = useTodayDeepMinutes()
  const { formatMinutes } = useDurationFormat()
  const filteredByCategory = useMemo(() => {
    return {
      work: tasks.filter((task) => (task.category ?? 'work') === 'work'),
      leisure: tasks.filter((task) => task.category === 'leisure'),
    }
  }, [tasks])

  const categoryDescriptions: Record<CategoryKey, string> = {
    work: '当前所有冷/暖任务，会在此处显示状态与进度。',
    leisure: '当前所有正在进行的娱乐安排，保持轻松的推进节奏。',
  }

  const getTabIndex = (tab: CategoryKey) =>
    CATEGORY_TABS.findIndex((item) => item.key === tab)

  const refreshTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listTasks()
      setTasks(result)
      refreshTodayMinutes()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [refreshTodayMinutes])

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    if (!tasks.length) {
      setRecommendation(null)
      return
    }
    const result = recommendTasks(tasks, timePreference)
    setRecommendation(result)
  }, [tasks, timePreference])

  const handleMarkDone = async (taskId: string) => {
    try {
      await markDone(taskId)
      refreshTasks()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleStart = async (taskId: string) => {
    try {
      await startFocus(taskId)
      navigate('/focus')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleRecommendOpen = () => {
    setRecommendOpen(true)
  }
  const focusingId = focusingTask?.id ?? session?.taskId ?? null

  return (
    <section className="page home-page">
      <p className="page-kicker">Home</p>
      <h1>Deep Work · Journalist Mode</h1>
      <p className="page-lead">
        今日累计深度：
        {isTodayLoading ? '计算中…' : formatMinutes(todayMinutes)}
      </p>
      {todayError ? <p className="error-text">统计失败：{todayError}</p> : null}

      <div className="page-card">
        <h2>一键进行</h2>
        {recommendation && recommendation.top ? (
          <>
            <p>
              当前推荐：<strong>{recommendation.top.title || '未命名任务'}</strong>
              {recommendation.top.remaining_minutes !== null
                ? ` · 预计剩余 ${formatMinutes(recommendation.top.remaining_minutes)}`
                : ' · 未设置 estimate'}
            </p>
            {recommendation.message ? (
              <p className="hint-text">{recommendation.message}</p>
            ) : null}
          </>
        ) : (
          <p>暂时没有可推荐的任务，请先添加或恢复任务。</p>
        )}
        <button
          className="primary-button"
          type="button"
          onClick={handleRecommendOpen}
          disabled={!recommendation || !recommendation.top}
        >
          立即一键进行
        </button>
      </div>

      <div className="slider-group">
        <div className="slider-tabs" role="tablist">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={creationTab === tab.key ? 'chip-button is-active' : 'chip-button'}
              onClick={() => setCreationTab(tab.key)}
            >
              创建新{tab.label}
            </button>
          ))}
        </div>
        <div className="slider-viewport">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${getTabIndex(creationTab) * 100}%)` }}
          >
            {CATEGORY_TABS.map((tab) => (
              <div className="slider-pane" key={tab.key}>
                <div className="page-card">
                  <h2>创建新{tab.label}</h2>
                  <NewTaskForm
                    category={tab.key}
                    onCreated={refreshTasks}
                    titleLabel={`${tab.label}标题`}
                    submitLabel={`添加${tab.label}`}
                    placeholder={
                      tab.key === 'work'
                        ? '例如：采访大纲·整理前半段'
                        : '例如：Switch 健身 · 健身环 20 分钟'
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="slider-group">
        <div className="slider-tabs" role="tablist">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={listTab === tab.key ? 'chip-button is-active' : 'chip-button'}
              onClick={() => setListTab(tab.key)}
            >
              未归档{tab.label}
            </button>
          ))}
        </div>
        <div className="slider-viewport">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${getTabIndex(listTab) * 100}%)` }}
          >
            {CATEGORY_TABS.map((tab) => (
              <div className="slider-pane" key={tab.key}>
                <div className="page-card">
                  <h2>未归档{tab.label}列表</h2>
                  <p>{categoryDescriptions[tab.key]}</p>
                  {error ? <p className="error-text">读取失败：{error}</p> : null}
                  <TaskList
                    tasks={filteredByCategory[tab.key]}
                    isLoading={isLoading}
                    onRefresh={refreshTasks}
                    onMarkDone={handleMarkDone}
                    onStart={handleStart}
                    focusingTaskId={focusingId}
                    isStarting={isBusy}
                    emptyHint={`还没有未归档${tab.label}，创建一个来开启深度。`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RecommendModal
        isOpen={isRecommendOpen}
        onClose={() => setRecommendOpen(false)}
        initialMinutes={timePreference}
        lastCustomMinutes={customMinutes}
        recommendation={recommendation}
        onStartTask={async (taskId) => {
          await handleStart(taskId)
          setRecommendOpen(false)
        }}
        onConfirm={async (minutes, customValue) => {
          await savePreference(minutes, customValue)
          const result = recommendTasks(tasks, minutes)
          setRecommendation(result)
        }}
      />
    </section>
  )
}

export default HomePage
