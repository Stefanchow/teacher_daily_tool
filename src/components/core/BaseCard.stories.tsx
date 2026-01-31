import type { Meta, StoryObj } from '@storybook/react';
import { BaseCard } from './BaseCard';
import { LessonPhases } from './LessonPhases';
import { EricLessonRenderer } from './EricLessonRenderer';

const meta: Meta<typeof BaseCard> = {
  title: 'Core/BaseCard',
  component: BaseCard,
  tags: ['autodocs'],
  argTypes: {
    grade: {
      control: 'select',
      options: ['primary', 'middle', 'high'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof BaseCard>;

export const PrimarySchool: Story = {
  args: {
    grade: 'primary',
    gradeLabel: 'Grade 3',
    title: '第一单元：认识新朋友',
    duration: 45,
    children: (
      <LessonPhases phases={[
        { type: 'warmup', content: 'Sing "Hello Song" with gestures' },
        { type: 'pre', content: 'Learn new words: friend, teacher, student' },
        { type: 'while', content: 'Role-play introduction in pairs' },
        { type: 'post', content: 'Class survey: Find someone who...' }
      ]} />
    ),
  },
};

export const EricPremiumLesson: Story = {
  args: {
    grade: 'primary',
    gradeLabel: 'Grade 6',
    title: 'Hainan Free Trade Port: Shopping Paradise',
    duration: 25,
    children: (
      <EricLessonRenderer phases={[
        {
          title: '神秘导入与情境创设 (Mystery Lead-in)',
          duration: 5,
          steps: [
            {
              title: '神秘包裹导入',
              emoji: '📦',
              duration: 2,
              teacherActivity: '"Good morning, young detectives! Today, I received a VERY special package from a mysterious place... Listen! What can you hear?"',
              studentActivity: 'Guessing game: "Something is shaking inside!", "I can see Hainan!"',
              interaction: 'Teacher shakes package -> Students listen and guess'
            },
            {
              title: '逐步揭秘与真相大白',
              emoji: '🔓',
              duration: 3,
              teacherActivity: 'Play countdown video of Hainan 2025. Open package to reveal Duty-Free goods (Cosmetics, Coffee). "Look! In Wuhan this costs 1000, but in Hainan... 500!"',
              studentActivity: 'Watch video. Compare prices. "Wow! Save 500 yuan!"'
            }
          ]
        },
        {
          title: '语言输入与知识建构 (Language Input)',
          duration: 7,
          steps: [
            {
              title: '特工词汇训练',
              emoji: '🕵️',
              duration: 3,
              teacherActivity: 'Introduce "Agent Words": Duty-free (No tax), Discount (Special price), Tourist (People we want).',
              studentActivity: 'Repeat and memorize new vocabulary.'
            },
            {
              title: '句型特工训练',
              emoji: '💬',
              duration: 4,
              teacherActivity: 'Activity A: Price Detective (Guess prices of covered items). Activity B: Savings Calculator (Calculate discounts).',
              studentActivity: 'Pair work: "I think it costs..." / "You save 60 yuan!"'
            }
          ]
        },
        {
          title: '任务执行与海报制作 (Task Execution)',
          duration: 10,
          steps: [
            {
              title: '任务说明',
              emoji: '📋',
              duration: 1,
              teacherActivity: 'Show poster examples. Requirements: Title, Products, Offers, Welcome Message.',
              studentActivity: 'Analyze examples and form groups of 4.'
            },
            {
              title: '小组制作',
              emoji: '🎨',
              duration: 7,
              teacherActivity: 'Distribute materials (A3 paper, markers). Circulate and guide: "What products? Coconuts? Buy 3 get 1 free?"',
              studentActivity: 'Group work: Design poster, draw products, write prices and slogans.'
            },
            {
              title: '特工展示会',
              emoji: '🎤',
              duration: 2,
              teacherActivity: '"Mission time over! Present your masterpiece!" Feedback: "Your secret weapon is the special offer!"',
              studentActivity: 'Group presentation: "Greetings tourists! Welcome to Hainan!"'
            }
          ]
        },
        {
          title: '总结升华与拓展 (Summary & Extension)',
          duration: 3,
          steps: [
            {
              title: '特工总结报告',
              emoji: '📝',
              duration: 1,
              teacherActivity: '"Agents, report back! What did we learn?"',
              studentActivity: 'Recap words (Duty-free, Bargain) and sentences.'
            },
            {
              title: '情感升华',
              emoji: '🌟',
              duration: 1,
              teacherActivity: 'Show Hainan Past vs Present. "What does Free Trade Port mean? How does it make you feel?"',
              studentActivity: '"Proud! Excited! Study hard!"'
            },
            {
              title: '拓展任务',
              emoji: '🚀',
              duration: 1,
              teacherActivity: 'Homework: Share poster photo (Basic) / Make video (Challenge) / Design brochure (Super Agent).',
              studentActivity: 'Choose mission level.'
            }
          ]
        }
      ]} />
    ),
  },
};

export const WaterCycleLesson: Story = {
  args: {
    grade: 'primary',
    gradeLabel: 'Science G3',
    title: 'The Amazing Water Cycle: Nature\'s Journey',
    duration: 45,
    children: (
      <LessonPhases phases={[
        { type: 'warmup', content: 'Sing "Water Cycle Song" with hand gestures' },
        { type: 'pre', content: 'Vocabulary Hunt: Evaporation, Condensation, Precipitation' },
        { type: 'while', content: 'Label the diagram while watching the animated video' },
        { type: 'post', content: 'Group Activity: Create a mini water cycle in a bag' },
        { type: 'assessment', content: 'Exit Ticket: Draw and label one stage' }
      ]} />
    ),
  },
};

export const MiddleSchool: Story = {
  args: {
    grade: 'middle',
    gradeLabel: 'Grade 8',
    title: 'Grammar Focus: Past Perfect Tense in Narrative Writing',
    duration: '45 min',
    children: 'Students will learn how to use past perfect tense to describe events that happened before another past action.',
  },
};

export const HighSchool: Story = {
  args: {
    grade: 'high',
    gradeLabel: 'Grade 11',
    title: 'Advanced Reading: The Great Gatsby - Symbolism Analysis',
    duration: 90,
    children: '深入分析《了不起的盖茨比》中的象征意义',
  },
};

export const LongTitle: Story = {
  args: {
    grade: 'primary',
    gradeLabel: 'Grade 5',
    title: 'Very Long Title Example: This is a very long title that should be truncated after two lines to ensure the layout remains consistent across different screen sizes and content lengths.',
    duration: 30,
    children: 'Check the title truncation behavior.',
  },
};
