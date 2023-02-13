import './App.css';
import Graph from "react-graph-vis";
import React, { useState } from "react";
import { useEffect } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import 'bootstrap/dist/css/bootstrap.css';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';

// GraphGPT Module

const DEFAULT_PARAMS = {
  "model": "text-davinci-003",
  "temperature": 0.3,
  "max_tokens": 800,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0
}

const SELECTED_PROMPT = "STATELESS"

const options = {
  layout: {
    hierarchical: false
  },
  edges: {
    color: "#34495e"
  }
};

function App() {

  const [graphState, setGraphState] = useState(
    {
      nodes: [],
      edges: []
    }
  );

  const clearState = () => {
    setGraphState({
      nodes: [],
      edges: []
    })
  };

  const updateGraph = (updates) => {
    // updates will be provided as a list of lists
    // each list will be of the form [ENTITY1, RELATION, ENTITY2] or [ENTITY1, COLOR]

    var current_graph = JSON.parse(JSON.stringify(graphState));

    if (updates.length === 0) {
      return;
    }

    // check type of first element in updates
    if (typeof updates[0] === "string") {
      // updates is a list of strings
      updates = [updates]
    }

    updates.forEach(update => {
      if (update.length === 3) {
        // update the current graph with a new relation
        const [entity1, relation, entity2] = update;

        // check if the nodes already exist
        var node1 = current_graph.nodes.find(node => node.id === entity1);
        var node2 = current_graph.nodes.find(node => node.id === entity2);

        if (node1 === undefined) {
          current_graph.nodes.push({ id: entity1, label: entity1, color: "#ffffff" });
        }

        if (node2 === undefined) {
          current_graph.nodes.push({ id: entity2, label: entity2, color: "#ffffff" });
        }

        // check if an edge between the two nodes already exists and if so, update the label
        var edge = current_graph.edges.find(edge => edge.from === entity1 && edge.to === entity2);
        if (edge !== undefined) {
          edge.label = relation;
          return;
        }

        current_graph.edges.push({ from: entity1, to: entity2, label: relation });

      } else if (update.length === 2 && update[1].startsWith("#")) {
        // update the current graph with a new color
        const [entity, color] = update;

        // check if the node already exists
        var node = current_graph.nodes.find(node => node.id === entity);

        if (node === undefined) {
          current_graph.nodes.push({ id: entity, label: entity, color: color });
          return;
        }

        // update the color of the node
        node.color = color;

      } else if (update.length === 2 && update[0] == "DELETE") {
        // delete the node at the given index
        const [_, index] = update;

        // check if the node already exists
        var node = current_graph.nodes.find(node => node.id === index);

        console.log("HIII");

        if (node === undefined) {
          return;
        }

        // delete the node
        current_graph.nodes = current_graph.nodes.filter(node => node.id !== index);

        // delete all edges that contain the node
        current_graph.edges = current_graph.edges.filter(edge => edge.from !== index && edge.to !== index);
      }
    });
    setGraphState(current_graph);
  };

  const queryStatelessPrompt = (prompt, apiKey) => {
    fetch('prompts/stateless.prompt')
      .then(response => response.text())
      .then(text => text.replace("$prompt", prompt))
      .then(prompt => {
        console.log(prompt)

        const params = { ...DEFAULT_PARAMS, prompt: prompt, stop: "\n" };

        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + String(apiKey)
          },
          body: JSON.stringify(params)
        };
        fetch('https://api.openai.com/v1/completions', requestOptions)
          .then(response => {
            if (!response.ok) {
              switch (response.status) {
                case 401: // 401: Unauthorized: API key is wrong
                  throw new Error('Please double-check your API key.');
                case 429: // 429: Too Many Requests: Need to pay
                  throw new Error('You exceeded your current quota, please check your plan and billing details.');
                default:
                  throw new Error('Something went wrong with the request, please check the Network log');
              }
            }
            return response.json();
          })
          .then((response) => {
            const { choices } = response;
            const text = choices[0].text;
            console.log(text);

            const updates = JSON.parse(text);
            console.log(updates);

            updateGraph(updates);

            document.getElementsByClassName("searchBar")[0].value = "";
            document.body.style.cursor = 'default';
            document.getElementsByClassName("generateButton")[0].disabled = false;
          }).catch((error) => {
            console.log(error);
            alert(error);
          });
      })
  };

  const queryStatefulPrompt = (prompt, apiKey) => {
    fetch('prompts/stateful.prompt')
      .then(response => response.text())
      .then(text => text.replace("$prompt", prompt))
      .then(text => text.replace("$state", JSON.stringify(graphState)))
      .then(prompt => {
        console.log(prompt)

        const params = { ...DEFAULT_PARAMS, prompt: prompt };

        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + String(apiKey)
          },
          body: JSON.stringify(params)
        };
        fetch('https://api.openai.com/v1/completions', requestOptions)
          .then(response => {
            if (!response.ok) {
              switch (response.status) {
                case 401: // 401: Unauthorized: API key is wrong
                  throw new Error('Please double-check your API key.');
                case 429: // 429: Too Many Requests: Need to pay
                  throw new Error('You exceeded your current quota, please check your plan and billing details.');
                default:
                  throw new Error('Something went wrong with the request, please check the Network log');
              }
            }
            return response.json();
          })
          .then((response) => {
            const { choices } = response;
            const text = choices[0].text;
            console.log(text);

            const new_graph = JSON.parse(text);

            setGraphState(new_graph);

            document.getElementsByClassName("searchBar")[0].value = "";
            document.body.style.cursor = 'default';
            document.getElementsByClassName("generateButton")[0].disabled = false;
          }).catch((error) => {
            console.log(error);
            alert(error);
          });
      })
  };

  const queryPrompt = (prompt, apiKey) => {
    if (SELECTED_PROMPT === "STATELESS") {
      queryStatelessPrompt(prompt, apiKey);
    } else if (SELECTED_PROMPT === "STATEFUL") {
      queryStatefulPrompt(prompt, apiKey);
    } else {
      alert("Please select a prompt");
      document.body.style.cursor = 'default';
      document.getElementsByClassName("generateButton")[0].disabled = false;
    }
  }


  const createGraph = () => {
    document.body.style.cursor = 'wait';

    document.getElementsByClassName("generateButton")[0].disabled = true;
    const prompt = document.getElementsByClassName("searchBar")[0].value;
    const apiKey = document.getElementsByClassName("apiKeyTextField")[0].value;

    queryPrompt(prompt, apiKey);
  }

  //
  // Start Textbook PDF Viewer module
  //

  const [selectedChapter, setSelectedChapter] = useState(null);
  const [inSections, setInSections] = useState([]);
	const [numPages, setNumPages] = useState(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [pdfFile, setPdfFile] = useState('textbook-1.pdf');
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    fetch('page_info.json')
      .then(response => response.json())
      .then(jsonData => {
        setChapters(Object.entries(jsonData));
        setSelectedChapter(jsonData[Object.keys(jsonData)[0]]);
      });
  }, []);

  useEffect(() => {
    if (selectedChapter) {
      setInSections(Object.entries(selectedChapter["in_sections"]));
    }
  }, [selectedChapter]);

	const onDocumentLoadSuccess = ({ numPages }) => {
		setNumPages(numPages);
	};

	const goToPrevPage = () =>
		setPageNumber(pageNumber - 1 <= 1 ? 1 : pageNumber - 1);

	const goToNextPage = () =>
		setPageNumber(
			pageNumber + 1 >= numPages ? numPages : pageNumber + 1,
		);

	const handleSelect = (eventKey) => {
		setPdfFile(`textbook-${eventKey}.pdf`);
		setPageNumber(1);
	};

  const handlePageNumberChange = (event) => {
		const newPageNumber = parseInt(event.target.value, 10);
		if (newPageNumber >= 1 && newPageNumber <= numPages) {
			setPageNumber(newPageNumber);
		}
	};

  const handleChapterSelect = (eventKey) => {
    fetch('page_info.json')
      .then(response => response.json())
      .then(jsonData => {
        setSelectedChapter(jsonData[`CHAPTER_${eventKey}`]);
        setPdfFile(`textbook-${eventKey}.pdf`);
        setPageNumber(1);
      });
  };

  const handleSectionSelect = (eventKey) => {
    let page_num = parseInt(eventKey)
    setPageNumber(page_num);
  };

	return (
		<div style={{ display: 'flex', flexDirection: 'row' }}>
      <div className='pdf_viewer' style={{ flex: 1 }}>
          <nav style={{ display: 'flex', alignItems: 'center' }}>
              <DropdownButton onSelect={handleChapterSelect} id="dropdown-basic-button" title="Select Chapter">
                  {chapters.map((chapter) => (
                    <Dropdown.Item key={chapter[0]} eventKey={parseInt(chapter[0].split("_")[1], 10)}>
                      Chapter {parseInt(chapter[0].split("_")[1], 10)}: {chapter[1].name.replaceAll("_", " ")}
                    </Dropdown.Item>
                  ))}
              </DropdownButton>{" "}
              <DropdownButton onSelect={handleSectionSelect} id="dropdown-basic-button" title="Select Section">
              {inSections.map((section) => (
                <Dropdown.Item key={section[0]} eventKey={section[1]}>
                  {section[0]}
                </Dropdown.Item>
              ))}
              </DropdownButton>
          </nav>
          <nav style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={goToPrevPage}>Prev</button>
            <button onClick={goToNextPage}>Next</button>
            <Form.Control
              type="text"
              value={pageNumber}
              onChange={handlePageNumberChange}
              style={{ width: '50px' }}
              />
          </nav>

            <p>
              Page {pageNumber} of {numPages}
            </p>
            
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            <Page scale={1.5} pageNumber={pageNumber} />
          </Document>
      </div>
        <div className='knowledge_graph' style={{ flex: 1.5 }}>
          <h1 className="headerText">TextbookKG 📖</h1>
          {/* <p className='subheaderText'>Build complex, directed graphs to add structure to your ideas using natural language. Understand the relationships between people, systems, and maybe solve a mystery.</p> */}
          {/* <center>
            <div className='inputContainer'>
              <input className="searchBar" placeholder="Describe your graph..."></input>
              <input className="apiKeyTextField" type="password" placeholder="Enter your OpenAI API key..."></input>
              <button className="generateButton" onClick={createGraph}>Generate</button>
              <button className="clearButton" onClick={clearState}>Clear</button>
            </div>
          </center> */}
          <div className='graphContainer'>
            <Graph graph={graphState} options={options} style={{ height: "640px" }} />
          </div>
          <p className='footer'>Pro tip: don't take a screenshot! You can right-click and save the graph as a .png  📸</p>
        </div>
		</div>

	);





}



export default App;
