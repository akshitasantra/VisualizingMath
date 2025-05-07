// /scripts/progress.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyAMPqEC7vmFh0Sm22KMmAVxaS_F7CI_YRM',
    authDomain: 'visualizing-math.firebaseapp.com',
    projectId: 'visualizing-math',
    storageBucket: 'visualizing-math.appspot.com',
    messagingSenderId: '128503124502',
    appId: '1:128503124502:web:a5a5c786244e25c0af9b37',
    measurementId: 'G-7LGGDVLGLP'
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/**
 * Persist one question’s result. 
 * If logged in → Firestore “users/{uid}.progress.{qid} = isCorrect”
 * Else → localStorage.setItem(qid, JSON.stringify(isCorrect))
 */
export async function writeProgress(qid, isCorrect) {
  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { [`progress.${qid}`]: isCorrect });
  } else {
    localStorage.setItem(qid, JSON.stringify(isCorrect));
  }
}

/**
 * Read *all* saved progress as an object { q1Correct: true, q2Correct: false, … }
 */
export async function readAllProgress() {
  const user = auth.currentUser;
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    return (snap.exists() && snap.data().progress) || {};
  } else {
    const prog = {};
    for (let i = 1; i <= 78; i++) {
      const key = `q${i}Correct`;
      const v = localStorage.getItem(key);
      if (v !== null) prog[key] = JSON.parse(v);
    }
    return prog;
  }
}

/**
 * Fire this any time the auth-state might change,
 * passing in a callback that receives the latest progress object.
 */
export function onProgressLoaded(callback) {
  onAuthStateChanged(auth, async () => {
    const prog = await readAllProgress();
    callback(prog);
  });
}
