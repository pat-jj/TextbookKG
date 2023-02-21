import { useState, useEffect } from 'react';
import {Dimensions} from 'react-native';

function getWindowDimensions() {
  const  width = Dimensions.get('window').width;
  const  height = Dimensions.get('window').height;
  console.log(width, height)
  return {
    width,
    height
  };
}

export default function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}