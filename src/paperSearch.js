import React, { useState } from "react";
import axios from "axios";
import OpenAI from "openai";

const PaperSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChinese, setIsChinese] = useState(false);

  const queryLLM = async (userText, systemPrompt) => {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error querying LLM:", error);
      throw error;
    }
  };

  const searchArxiv = async () => {
    setIsLoading(true);
    try {
      // Query LLM for keywords
      const keywords = await queryLLM(
        searchQuery,
        "You are an AI assistant that extracts the most important keywords from a query for searching academic papers. Provide only the keywords, separated by spaces."
      );

      // Search Arxiv with the keywords
      const response = await axios.get(
        `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(keywords)}&start=0&max_results=${maxResults}`
      );
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      const entries = xmlDoc.getElementsByTagName("entry");
      
      const results = await Promise.all(Array.from(entries).map(async (entry) => {
        const title = entry.getElementsByTagName("title")[0].textContent;
        const authors = Array.from(entry.getElementsByTagName("author")).map(
          (author) => author.getElementsByTagName("name")[0].textContent
        );
        const summary = entry.getElementsByTagName("summary")[0].textContent;
        const link = entry.getElementsByTagName("id")[0].textContent;

        // Query LLM for relevance
        const relevance = await queryLLM(
          `Query: "${searchQuery}"\nPaper title: "${title}"\nPaper summary: "${summary}"`,
          `You are an AI assistant that explains how a scientific paper is relevant to a given query. Provide a concise explanation in 2-3 sentences. Only output the explanation. Output in ${isChinese ? 'Chinese' : 'English'}.`
        );

        return { title, authors, summary, link, relevance };
      }));
      
      setSearchResults(results);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  };

  const styles = {
    container: {
      padding: '40px',
      maxWidth: '2000px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f4f8',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    header: {
      color: '#2c3e50',
      marginBottom: '30px',
      textAlign: 'center',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '40px',
    },
    inputContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    input: {
      width: '100%',
      padding: '15px',
      fontSize: '16px',
      border: '1px solid #bdc3c7',
      borderRadius: '5px',
      transition: 'border-color 0.3s ease',
    },
    searchInput: {
      width: '100%',
      padding: '20px',
      fontSize: '18px',
      border: '2px solid #3498db',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    searchInputFocus: {
      borderColor: '#2980b9',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
    button: {
      width: '100%',
      padding: '15px',
      fontSize: '16px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    },
    buttonHover: {
      backgroundColor: '#2980b9',
    },
    resultsContainer: {
      overflowY: 'auto',
      maxHeight: 'calc(100vh - 200px)',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '5px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    resultItem: {
      marginBottom: '30px',
      padding: '20px',
      borderBottom: '1px solid #ecf0f1',
    },
    resultTitle: {
      color: '#2c3e50',
      marginBottom: '10px',
    },
    resultText: {
      marginBottom: '10px',
      color: '#34495e',
    },
    link: {
      color: '#3498db',
      textDecoration: 'none',
    },
    switchContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: '20px',
    },
    switch: {
      position: 'relative',
      display: 'inline-block',
      width: '60px',
      height: '34px',
    },
    switchInput: {
      opacity: 0,
      width: 0,
      height: 0,
    },
    switchSlider: {
      position: 'absolute',
      cursor: 'pointer',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#ccc',
      transition: '0.4s',
      borderRadius: '34px',
    },
    switchSliderBefore: {
      position: 'absolute',
      content: '""',
      height: '26px',
      width: '26px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.4s',
      borderRadius: '50%',
    },
    switchText: {
      marginLeft: '10px',
      fontSize: '16px',
    },
    numberInputContainer: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        border: '1px solid #bdc3c7',
        borderRadius: '5px',
        overflow: 'hidden',
      },
      numberInputLabel: {
        padding: '15px',
        backgroundColor: '#f0f4f8',
        whiteSpace: 'nowrap',
        fontSize: '16px',
        color: '#2c3e50',
      },
      numberInput: {
        flex: 1,
        padding: '15px',
        fontSize: '16px',
        border: 'none',
        outline: 'none',
      },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Academic Paper Search</h1>
      <div style={styles.grid}>
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter search query"
            style={styles.searchInput}
            onFocus={(e) => e.target.style.boxShadow = styles.searchInputFocus.boxShadow}
            onBlur={(e) => e.target.style.boxShadow = styles.searchInput.boxShadow}
          />
          <div style={styles.numberInputContainer}>
            <span style={styles.numberInputLabel}>Max papers to search:</span>
            <input
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(Math.max(1, parseInt(e.target.value) || 1))}
              style={styles.numberInput}
              min="1"
            />
          </div>

          <button 
            onClick={searchArxiv} 
            disabled={isLoading || !apiKey}
            style={{
              ...styles.button,
              ...(isLoading || !apiKey ? {} : styles.buttonHover),
            }}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
          <div style={styles.switchContainer}>
            <label style={styles.switch}>
              <input
                type="checkbox"
                checked={isChinese}
                onChange={() => setIsChinese(!isChinese)}
                style={styles.switchInput}
              />
              <span style={{
                ...styles.switchSlider,
                backgroundColor: isChinese ? '#2196F3' : '#ccc',
              }}>
                <span style={{
                  ...styles.switchSliderBefore,
                  transform: isChinese ? 'translateX(26px)' : 'translateX(0)',
                }}></span>
              </span>
            </label>
            <span style={styles.switchText}>{isChinese ? '中文' : 'English'}</span>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter OpenAI API Key"
            style={styles.input}
          />
        </div>
        
        <div style={styles.resultsContainer}>
          {searchResults.map((result, index) => (
            <div key={index} style={styles.resultItem}>
              <h3 style={styles.resultTitle}>{result.title}</h3>
              <p style={styles.resultText}><strong>Authors:</strong> {result.authors.join(", ")}</p>
              <p style={styles.resultText}><strong>Abstract:</strong> {result.summary.substring(0, 200)}...</p>
              <p style={styles.resultText}><strong>Relevance:</strong> {result.relevance}</p>
              <a href={result.link} target="_blank" rel="noopener noreferrer" style={styles.link}>
                View on arXiv
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaperSearchPage;