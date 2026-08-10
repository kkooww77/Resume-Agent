import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardTitle, CardDescription } from './ui/card'
import { Plus } from './Icons'
import { cn } from '@/lib/utils'

interface CreateCardProps {
  onClick: () => void
}

export const CreateCard: React.FC<CreateCardProps> = ({ onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className="relative group"
    >
      <Card
        className={cn(
          "resume-dashboard-card relative flex cursor-pointer flex-col overflow-hidden rounded-none border-2 border-dashed border-black transition-[box-shadow,transform,background-color] duration-150 fresh:rounded-md fresh:border fresh:border-slate-300",
          "bg-[#F2F1EA] fresh:bg-white",
          "hover:bg-[#E5E5E0] fresh:hover:bg-slate-50 group-hover:shadow-none fresh:group-hover:shadow-md"
        )}
      >
        <CardContent className="flex-1 pt-6 text-center flex flex-col items-center justify-center h-full z-10">
          <motion.div
            className="mb-4 p-3 rounded-none fresh:rounded-md bg-[#4285F4] fresh:bg-blue-600 text-white shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none border-2 fresh:border border-black fresh:border-blue-600"
          >
            <Plus className="h-6 w-6 text-white" />
          </motion.div>

          <CardTitle className="text-lg font-sans font-semibold tracking-tight text-black fresh:text-slate-800">
            新建简历
          </CardTitle>

          <CardDescription className="mt-2 text-sm font-mono fresh:font-sans text-black/50 fresh:text-slate-500 max-w-[180px]">
            从空白内容开始
          </CardDescription>
        </CardContent>

        {/* 装饰线 */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black fresh:hidden transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      </Card>
    </motion.div>
  )
}

