import { h } from 'vue'
import { Icon } from '@iconify/vue'

// Public Element Plus icon props accept Vue components.
export const ChevronDownIcon = () => h(Icon, { icon: 'lucide:chevron-down' })
export const ChevronUpIcon = () => h(Icon, { icon: 'lucide:chevron-up' })
export const CloseIcon = () => h(Icon, { icon: 'lucide:x' })
