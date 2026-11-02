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
  const [isBlending, setIsBlending] = useState(false);
  
  // New states for the requested features
  const [isShuffled, setIsShuffled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);

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

  const handleTapToHear = async () => {
    if (!currentCard.id.toString().startsWith('dynamic-')) {
      playVoice(currentCard.tts_phrase);
      return;
    }

    setIsVerifying(true); // Start the loading indicator

    // Step 1: Verify the spelling
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${currentCard.word}`);
      
      if (!response.ok) {
        setIsVerifying(false); 
        alert(`Oops! "${currentCard.word}" doesn't look like a real word. Try checking the spelling!`);
        
        // Clean up the rejected card so Liam doesn't get stuck
        setCards(prevCards => prevCards.filter(c => c.id !== currentCard.id));
        setCurrentIndex(prevIndex => prevIndex > 0 ? prevIndex - 1 : 0);
        return; 
      }
    } catch (error) {
      console.error("Dictionary API Error:", error);
      setIsVerifying(false); 
      alert("Network error while checking the spelling. Please try again.");
      
      // Clean up the card on network errors to prevent loops
      setCards(prevCards => prevCards.filter(c => c.id !== currentCard.id));
      setCurrentIndex(prevIndex => prevIndex > 0 ? prevIndex - 1 : 0);
      return;
    }

    // Step 2: Spelling is correct! Stop the loading indicator and play the audio
    setIsVerifying(false); 
    playVoice(currentCard.tts_phrase);

    // Step 3: Save to PocketBase (wrapped in a timeout to let the UI update first)
    setTimeout(async () => {
      const shouldSave = window.confirm(`Great job, "${currentCard.word}" is spelled correctly! Do you want to save it to Liam's flashcards?`);
      
      if (shouldSave) {
        try {
          const savedRecord = await pb.collection('phonics_flashcards').create({
            word: currentCard.word,
            vowel_text: currentCard.vowel_text, 
            tts_phrase: currentCard.tts_phrase,
            category: 'Custom' 
          });

          // Update the deck to make the dynamic card a permanent database record
          setCards(prevCards => prevCards.map(c => c.id === currentCard.id ? savedRecord : c));
          setOriginalCards(prevCards => [...prevCards, savedRecord]);
          
          alert("Word saved successfully!");
        } catch (dbError) {
          console.error("Database save error:", dbError);
          alert("The spelling is correct, but there was an error saving it to PocketBase.");
        }
      }
    }, 100); 
  };

  const playVoice = async (phrase) => {
    // Keep your existing logic to isolate the target word
    const sentences = phrase.split('.').map(s => s.trim()).filter(Boolean);
    const textToSpeak = sentences.length >= 2 ? sentences[1] : phrase;

    try {
      const response = await fetch('https://xps15.tail2c693e.ts.net:8443/v1/audio/speech', {
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
      
      // Trigger the visual pull-apart
      setIsBlending(true);
      audio.play();

      // Snap the word back together after a short delay (simulating blending)
      setTimeout(() => {
        setIsBlending(false);
      }, 800); 

      audio.onended = () => URL.revokeObjectURL(audioUrl);

      
      // Prevent memory leaks by revoking the object URL once playback finishes
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      //const audio = new Audio('https://eq14x.tail2c693e.ts.net/kokoro-tts/api/tts?text=' + encodeURIComponent(textToSpeak) + '&voice=af_heart&speed=0.85'); 
      audio.play();
    } catch (error) {
      console.error("Failed to fetch audio from Kokoro:", error);
    }
  };

const renderBlendedWord = (word, targetVowel) => {
    if (!word) return null;

    // A JavaScript regex heuristic to chunk English words into syllables
    const syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [word];

    return syllables.map((syllable, index) => {
      // Check if this specific syllable contains Liam's target irregular vowel
      let renderedSyllable = syllable;
      if (targetVowel && syllable.toLowerCase().includes(targetVowel.toLowerCase())) {
        const parts = syllable.split(new RegExp(`(${targetVowel})`, 'i'));
        renderedSyllable = parts.map((part, i) => (
          <span 
            key={i} 
            style={{ color: part.toLowerCase() === targetVowel.toLowerCase() ? '#E94E77' : 'inherit' }}
          >
            {part}
          </span>
        ));
      }

      return (
        <span
          key={index}
          style={{
            display: 'inline-block',
            color: '#333333', 
            // Bounces and spreads the syllables apart, rather than just the vowel
            transform: isBlending ? 'scale(1.2) translateY(-8px)' : 'scale(1)',
            margin: isBlending ? '0 15px' : '0',
            transition: 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            borderBottom: isBlending ? '4px solid #4A90E2' : '4px solid transparent', // Optional: underlines the syllable chunk
            paddingBottom: '4px'
          }}
        >
          {renderedSyllable}
        </span>
      );
    });
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
  const jumpToItem = () => {
    if (!searchTerm.trim()) return;
    
    const target = searchTerm.trim().toLowerCase();
    
    // Look for an exact match in either the whole word or the vowel text
    const index = cards.findIndex(c => 
      c.word.toLowerCase() === target || 
      (c.vowel_text && c.vowel_text.toLowerCase() === target)
    );
    
    if (index !== -1) {
      setCurrentIndex(index);
    } else {
      // Create a dynamic flashcard for the new word
      const newCard = {
        id: `dynamic-${Date.now()}`, 
        word: target,
        vowel_text: '⭐', // A fun indicator for Liam that this is a custom word
        tts_phrase: `${target}. ${target}.` // Formatted to work with your existing TTS isolation logic
      };
      
      // Append the new card to the end of the deck and jump to it
      const updatedCards = [...cards, newCard];
      setCards(updatedCards);
      setCurrentIndex(updatedCards.length - 1);
    }
    
    setSearchTerm(''); 
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
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && jumpToItem()}
            placeholder="Jump to word or vowel..."
          />
          <button style={styles.toolButton} onClick={jumpToItem}>Jump</button>
        </div>
      </div>
      
      <div style={styles.card} onClick={handleTapToHear}>
        <h2 style={styles.vowel}>{currentCard.vowel_text}</h2>
        <p style={styles.word}>
          {renderBlendedWord(currentCard.word, currentCard.vowel_text)}
        </p>
        <button style={styles.audioButton}>
          {isVerifying ? '⏳ Checking spelling...' : '🔊 Tap to Hear'}
        </button>
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
    width: '100%',
    maxWidth: '800px', 
    boxSizing: 'border-box', 
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
