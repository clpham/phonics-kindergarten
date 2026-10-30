import React, { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

// Initialize the PocketBase client targeting your backend IP
//const pb = new PocketBase('http://192.168.10.10:8090');
const pb = new PocketBase("https://eq14x.tail2c693e.ts.net/pocketbase");

const PhonicsFlashcards = () => {
  const [originalCards, setOriginalCards] = useState([]);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New states for the requested features
  const [isShuffled, setIsShuffled] = useState(false);
  const [searchVowel, setSearchVowel] = useState('');

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const records = await pb.collection('phonics_flashcards').getFullList({
          sort: 'category,vowel_text',
        });
        
        setOriginalCards(records);
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

  const playVoice = async (phrase) => {
    // Keep your existing logic to isolate the target word
    const sentences = phrase.split('.').map(s => s.trim()).filter(Boolean);
    const textToSpeak = sentences.length >= 2 ? sentences[1] : phrase;

    try {
      const response = await fetch('https://xps15.tail2c693e.ts.net/kokoro-tts/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'kokoro',
          input: textToSpeak+'.',
          voice: 'af_bella(2)+af_sarah(1)+am_michael(1)', // Default Kokoro voice; adjust as needed (e.g., af_bella, am_adam)
          response_format: 'mp3',
          speed: 1.00 // Must be >= 1.00
        })
      });

      if (!response.ok) {
        if (response.status === 422) {
          const errorDetail = await response.json();
          console.error("422 Validation Error details:", JSON.stringify(errorDetail, null, 2));
        }

        throw new Error(`Kokoro TTS server error: ${response.status}`);
      }

      // Convert the response stream to a blob and play it via HTML5 Audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      
      // Prevent memory leaks by revoking the object URL once playback finishes
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      //const audio = new Audio('https://eq14x.tail2c693e.ts.net/kokoro-tts/api/tts?text=' + encodeURIComponent(textToSpeak) + '&voice=af_heart&speed=0.85'); 
      audio.play();
    } catch (error) {
      console.error("Failed to fetch audio from Kokoro:", error);
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  // Shuffle implementation using Fisher-Yates
  const toggleShuffle = () => {
    if (isShuffled) {
      setCards([...originalCards]);
      setIsShuffled(false);
    } else {
      const shuffled = [...originalCards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setCards(shuffled);
      setIsShuffled(true);
    }
    setCurrentIndex(0); // Reset to the first card when deck order changes
  };

  // Fast forward feature
  const jumpToVowel = () => {
    if (!searchVowel.trim()) return;
    
    const target = searchVowel.trim().toLowerCase();
    const index = cards.findIndex(c => c.vowel_text.toLowerCase() === target);
    
    if (index !== -1) {
      setCurrentIndex(index);
    } else {
      alert(`Could not find the vowel pattern: "${searchVowel}"`);
    }
    setSearchVowel(''); // Clear input after search
  };

  if (isLoading) return <div style={styles.message}>Loading flashcards...</div>;
  if (error) return <div style={{...styles.message, color: 'red'}}>{error}</div>;
  if (cards.length === 0) return <div style={styles.message}>No flashcards found.</div>;

  const currentCard = cards[currentIndex];

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Flash Card</h1>
      
      {/* New Toolbar for Shuffle and Jump Features */}
      <div style={styles.toolbar}>
        <button style={styles.toolButton} onClick={toggleShuffle}>
          {isShuffled ? 'Sort Alphabetically' : 'Shuffle Cards'}
        </button>
        
        <div style={styles.searchContainer}>
          <input 
            style={styles.searchInput}
            type="text" 
            value={searchVowel} 
            onChange={(e) => setSearchVowel(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && jumpToVowel()}
            placeholder="Jump to vowel (e.g. 'igh')"
          />
          <button style={styles.toolButton} onClick={jumpToVowel}>Jump</button>
        </div>
      </div>
      
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
  header: {
    fontSize: '3rem',
    color: '#333333',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  toolbar: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '2rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  searchContainer: {
    display: 'flex',
    gap: '0.5rem',
  },
  searchInput: {
    fontSize: '1.2rem',
    padding: '10px',
    borderRadius: '12px',
    border: '2px solid #ccc',
    width: '220px',
    outline: 'none'
  },
  toolButton: {
    fontSize: '1.2rem',
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#6C757D',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold'
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
    fontSize: '3rem',
    color: '#E94E77',
    margin: '0 0 1rem 0',
  },
  word: {
    fontSize: '4rem',
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
