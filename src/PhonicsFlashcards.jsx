import React, { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

// Initialize the PocketBase client targeting your backend IP
//const pb = new PocketBase('http://192.168.10.10:8090');
const pb = new PocketBase("https://eq14x.tail2c693e.ts.net/pocketbase");

const PhonicsFlashcards = () => {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        // Fetch all flashcards from the collection, sorted by category
        const records = await pb.collection('phonics_flashcards').getFullList({
          sort: 'category,vowel_text',
        });
        
        setCards(records);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching flashcards:", err);
        setError("Failed to load flashcards. Please check your connection to the backend.");
        setIsLoading(false);
      }
    };

    fetchCards();
  }, []);

  const playVoice = (phrase) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      // Split the phrase by the period to separate the sound and the word
      const sentences = phrase.split('.').map(s => s.trim()).filter(Boolean);
      
      if (sentences.length >= 2) {
        const soundUtterance = new SpeechSynthesisUtterance(sentences[0]);
        const wordUtterance = new SpeechSynthesisUtterance(sentences[1]);
        
        // Apply the same voice settings to both parts
        [soundUtterance, wordUtterance].forEach(u => {
          u.rate = 0.85;
          u.pitch = 1.1;
        });

        // Play the first sentence ("The sound is X")
        window.speechSynthesis.speak(soundUtterance);
        
        // When the first sentence finishes playing, trigger a pause before the next
        soundUtterance.onend = () => {
          setTimeout(() => {
            window.speechSynthesis.speak(wordUtterance);
          }, 500); // 500ms = 0.75 second pause. Adjust as needed.
        };
      } else {
        // Fallback in case a card doesn't have a period
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 0.85; 
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      console.warn("Text-to-speech is not supported in this browser.");
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  if (isLoading) return <div style={styles.message}>Loading flashcards...</div>;
  if (error) return <div style={{...styles.message, color: 'red'}}>{error}</div>;
  if (cards.length === 0) return <div style={styles.message}>No flashcards found.</div>;

  const currentCard = cards[currentIndex];

  return (
    <div style={styles.container}>
      <div style={styles.card} onClick={() => playVoice(currentCard.tts_phrase)}>
        <h2 style={styles.vowel}>{currentCard.vowel_text}</h2>
        <p style={styles.word}>{currentCard.word}</p>
        <button style={styles.audioButton}>🔊 Tap to Hear</button>
      </div>
      
      <div style={styles.controls}>
        <button style={styles.navButton} onClick={prevCard}>Back</button>
        <span style={styles.counter}>{currentIndex + 1} / {cards.length}</span>
        <button style={styles.navButton} onClick={nextCard}>Next</button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    padding: '2rem',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '4px solid #4A90E2',
    borderRadius: '24px',
    padding: '4rem 2rem',
    textAlign: 'center',
    width: '300px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    marginBottom: '2rem',
  },
  vowel: {
    fontSize: '5rem',
    color: '#E94E77',
    margin: '0 0 1rem 0',
  },
  word: {
    fontSize: '3rem',
    color: '#333333',
    margin: '0 0 2rem 0',
  },
  audioButton: {
    fontSize: '1.5rem',
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#F3F4F6',
    pointerEvents: 'none',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  navButton: {
    fontSize: '1.5rem',
    padding: '15px 30px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#4A90E2',
    color: 'white',
    cursor: 'pointer',
  },
  counter: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  message: {
    fontSize: '2rem',
    textAlign: 'center',
    padding: '3rem',
    fontFamily: 'sans-serif'
  }
};

export default PhonicsFlashcards;
