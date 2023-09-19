function WikiResultsBox({ results, show, onClose }) {
    return (
        <div className={`wikiResultsBox ${show ? 'show' : ''}`}>
            <button className="closeWikiButton" onClick={onClose} style={{ float: 'right' }}>Close</button>
            <h3>Wikipedia Results</h3>
            <ul>
                {results.map((result, index) => (
                    <li key={index}>
                        <h4>{result.title}</h4>
                        <p dangerouslySetInnerHTML={{ __html: result.snippet }}></p>
                        <a href={`https://en.wikipedia.org/?curid=${result.pageid}`} target="_blank" rel="noopener noreferrer">Read more</a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default WikiResultsBox;
