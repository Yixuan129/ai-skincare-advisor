type IconName = 'compare' | 'guide' | 'arrow' | 'help' | 'leaf'

const paths: Record<IconName, string> = {
  compare: 'M8 4H4v16h4M16 4h4v16h-4M10 8h7m-2-2 2 2-2 2M14 16H7m2-2-2 2 2 2',
  guide: 'M5 4h10l4 4v12H5zM14 4v5h5M8 12h8M8 16h5',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  help: 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  leaf: 'M19 4C10 3 4 7 5 14c1 7 13 6 14-10ZM7 18 16 8',
}

export function UiIcon({ name }: { name: IconName }) {
  return <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}
