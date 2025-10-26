export const triggerHapticFeedback = () => {
  if (window.navigator && (window.navigator as any).vibrate) {
    (window.navigator as any).vibrate(50);
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const isCodeFile = (file: File): boolean => {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', 
    '.cs', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.md', 
    '.sh', '.bat', '.ps1', '.rb', '.php', '.go'
  ];
  
  const codeMimeTypes = [
    'application/javascript',
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'application/xml',
    'text/x-python',
    'text/x-java-source',
  ];

  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  if (codeMimeTypes.some(type => fileType.startsWith(type))) return true;
  if (codeExtensions.some(ext => fileName.endsWith(ext))) return true;
  return false;
};

const key = 'LumenSanctumSovereigntyKey';
const cipher = (str: string): string => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

export const setItem = (key: string, value: string): void => {
  try {
    const obfuscatedValue = btoa(cipher(value));
    localStorage.setItem(key, obfuscatedValue);
  } catch (error) {
    console.error(`Failed to set secure item '${key}':`, error);
  }
};

export const getItem = (key: string): string | null => {
  try {
    const obfuscatedValue = localStorage.getItem(key);
    if (obfuscatedValue === null) return null;
    return cipher(atob(obfuscatedValue));
  } catch (error) {
    console.error(`Failed to get secure item '${key}'. It might be corrupted. Removing it.`, error);
    localStorage.removeItem(key);
    return null;
  }
};

export const removeItem = (key: string): void => {
  localStorage.removeItem(key);
};
export const clear = (): void => {
  localStorage.clear();
};
