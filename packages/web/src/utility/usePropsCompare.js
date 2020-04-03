import _ from 'lodash';
import usePrevious from './usePrevious';

export default function usePropsCompare(props) {
  const prevProps = usePrevious(props);
  if (!prevProps) return;
  for (const key of _.union(_.keys(props), _.keys(prevProps))) {
    if (props[key] !== prevProps[key]) {
      console.log(`Different prop value found: prop=${key}, old=${prevProps[key]}, new=${prevProps[key]}`);
    }
  }
}
