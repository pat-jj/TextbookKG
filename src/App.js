import './App.css';
import Graph from "react-graph-vis";
import React, { useState } from "react";
import SelectSearch from 'react-select-search';
import './style.css'
import { useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import 'bootstrap/dist/css/bootstrap.css';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import { saveAs } from 'file-saver';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import jwt_decode from "jwt-decode";
import fireBase from "./firebaseConfig.js"
import { ref, uploadBytesResumable, getDownloadURL, getStorage, listAll, deleteObject } from "firebase/storage";
import { pdfjs } from 'react-pdf';
import {Dimensions} from 'react-native';
import Tesseract from 'tesseract.js';
import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import WikiResultsBox from './wikiSearchBox.js';
import Fuse from 'fuse.js';


pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// GraphGPT Module

const DEFAULT_PARAMS = {
  "model": "gpt-3.5-turbo-instruct",
  "temperature": 0.3,
  "max_tokens": 1200,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0
}

const SELECTED_PROMPT = "STATELESS"


function App() {

  const [graphState, setGraphState] = useState(
    {
      nodes: [],
      edges: []
    }
  );

  const clearState = () => {
    setSelectedEdge(null)
    setSelectedEdgeLabel(null)
    setSelectedNodeFrom(null)
    setSelectedNodeTo(null)
    setSelectedNode(null)
    setGraphState({
      nodes: [],
      edges: []
    })
  };


  const[selectedEdge, setSelectedEdge] = useState(null)
  const[selectedEdgeLabel, setSelectedEdgeLabel] = useState(null)
  const[selectedNode, setSelectedNode] = useState(null)
  const[selectedNodeFrom, setSelectedNodeFrom] = useState(null)
  const[selectedNodeTo, setSelectedNodeTo] = useState(null)
  const [isHierarchical, setIsHierarchical] = useState(false);
  const[eventState, setEventState] = useState( 
    {
      select: ({ nodes, edges }) => {
        console.log("Selected nodes:");
        console.log(nodes);
        console.log("Selected edges:");
        console.log(edges);
        setSelectedEdge(edges[0]);
        setSelectedNode(nodes[0]);
      },
    }
  );
  const options = {
    layout: {
      hierarchical: isHierarchical ? {
        enabled: true,
        levelSeparation: 150,     // Adjust this to increase space between levels
        nodeSpacing: 150,        // Adjust this to increase space between nodes on the same level
        treeSpacing: 200         // Adjust this to increase space between different trees in the same graph
      } : false
    },
    edges: {
      color: "#34495e",
      smooth: true,
      length: 250,
    },
    physics: isHierarchical ? false : {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0.3
      },
      stabilization: {
        iterations: 500
      }
    }
  };
  
  const graphRef = useRef(null);
  const animationOptions = {
    animation: {
      duration: 2000,
      easingFunction: "easeInQuad"
    }
  }

  useEffect(() => {
    if (selectedNodeFrom && !disableNodeAnimation) {
      graphRef.current.Network.focus(selectedNodeFrom, animationOptions);
      graphRef.current.Network.selectNodes([selectedNodeFrom]);
      setDisableNodeAnimation(true)
    } else if (selectedNodeFrom && disableNodeAnimation){
      try {
        graphRef.current.Network.selectNodes([selectedNodeFrom]);
      } catch {
        console.log("delete nodes")
      }
    } else {
      graphRef.current.Network.unselectAll();
    }
  }, [selectedNodeFrom]);


  useEffect(() => {
    if (selectedNodeTo && !disableNodeAnimation) {
      graphRef.current.Network.focus(selectedNodeTo, animationOptions);
      graphRef.current.Network.selectNodes([selectedNodeTo]);
      setDisableNodeAnimation(true)
    } else if (selectedNodeTo && disableNodeAnimation) {
      try {
        graphRef.current.Network.selectNodes([selectedNodeTo]);
      } catch {
        console.log("delete nodes")
      }
    } else {
      graphRef.current.Network.unselectAll();
    }
  }, [selectedNodeTo]);

  useEffect(() => {
    if (selectedEdge && !disableEdgeAnimation) {
      try {
        const edgeIndex = graphState.edges.findIndex(edge => edge.id === selectedEdge);

        graphRef.current.Network.focus(graphState.edges[edgeIndex].to, animationOptions);
        graphRef.current.Network.selectEdges([selectedEdge]);

        setSelectedEdgeLabel(graphState.edges[edgeIndex].label);
        setSelectedNodeFrom(graphState.edges[edgeIndex].from);
        setSelectedNodeTo(graphState.edges[edgeIndex].to);

        // Update the input values
        document.getElementsByClassName("node1Add")[0].value = graphState.edges[edgeIndex].from;
        document.getElementsByClassName("edgeAdd")[0].value = graphState.edges[edgeIndex].label;
        document.getElementsByClassName("node2Add")[0].value = graphState.edges[edgeIndex].to;

        setDisableEdgeAnimation(true)
      } catch {
        console.log("Error")
      }
    
    } else if (selectedEdge && disableEdgeAnimation){
      try{
        const edgeIndex = graphState.edges.findIndex(edge => edge.id === selectedEdge);
        setSelectedEdgeLabel(graphState.edges[edgeIndex].label);
        setSelectedNodeFrom(graphState.edges[edgeIndex].from);
        setSelectedNodeTo(graphState.edges[edgeIndex].to);
  
        // Update the input values
        document.getElementsByClassName("node1Add")[0].value = graphState.edges[edgeIndex].from;
        document.getElementsByClassName("edgeAdd")[0].value = graphState.edges[edgeIndex].label;
        document.getElementsByClassName("node2Add")[0].value = graphState.edges[edgeIndex].to;
      } catch {
        console.log("delete edge")
      }

    } else {
      setSelectedEdgeLabel(null);
      setSelectedNodeFrom(null);
      setSelectedNodeTo(null);

      // Reset the input values
      document.getElementsByClassName("node1Add")[0].value = "";
      document.getElementsByClassName("edgeAdd")[0].value = "";
      document.getElementsByClassName("node2Add")[0].value = "";

      graphRef.current.Network.unselectAll();
    }
  }, [selectedEdge, graphState.edges]);


  useEffect(() => {
    if (selectedNodeFrom) {
      document.getElementsByClassName("node1Add")[0].value = selectedNodeFrom;
    
    } else {
      document.getElementsByClassName("node1Add")[0].value = "";

    }
  }, [selectedNodeFrom]);

  useEffect(() => {
    if (selectedNodeTo) {
      document.getElementsByClassName("node2Add")[0].value = selectedNodeTo;
    
    } else {
      document.getElementsByClassName("node2Add")[0].value = "";

    }
  }, [selectedNodeTo]);


  const updateGraph = async (updates) => {
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

      } else if (update.length === 2 && update[0] === "DELETE") {
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
    // console.log(current_graph);
  };

  const [userPrompt, setUserPrompt] = useState("");

  const initPrompt = () => {
    fetch('/TextbookKG/prompts/stateless.prompt')
      .then(response => response.text())
      .then(text => setUserPrompt(text))
      .then(console.log(userPrompt))
  }

  useEffect(() => {
    initPrompt();
  }, []);

  const queryStatelessPrompt = async (userText, apiKey, userPrompt) => {
    const replacedPrompt = userPrompt.replace("$TEXT$", userText);
    
    console.log(replacedPrompt)
  
    const params = { ...DEFAULT_PARAMS, prompt: replacedPrompt, stop: "\n" };
  
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
      
        // Remove the last incomplete JSON object if there is any
        let formattedText = text.trim();

        // Find the last occurrence of ]
        let lastIndex = formattedText.lastIndexOf(']');

        // If found, truncate the string to that point and then close the entire array with another ]
        if (lastIndex !== -1 && formattedText.endsWith("]]") === false){
          formattedText = formattedText.substring(0, lastIndex + 1) + ']';
        }

        console.log(formattedText);
      
        try {
        const updates = JSON.parse(formattedText);
        // console.log(updates);
        updateGraph(updates);
        } catch (error) {
          console.error('Failed to parse JSON:', error);
          document.getElementsByClassName("generateButton")[0].disabled = false;
          setCurrentIndex(-1);
        }
      });
  };
  

  const queryStatelessPromptExt = async (prompt, apiKey) => {
    fetch('/TextbookKG/prompts/stateless_ext.prompt')
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
          
            // Remove the last incomplete JSON object if there is any
            let formattedText = text.trim();

            // Find the last occurrence of ]
            let lastIndex = formattedText.lastIndexOf(']');

            // If found, truncate the string to that point and then close the entire array with another ]
            if (lastIndex !== -1 && formattedText.endsWith("]]") === false){
                formattedText = formattedText.substring(0, lastIndex + 1) + ']';
            }

            console.log(formattedText);
          
            try {
              const updates = JSON.parse(formattedText);
              console.log(updates);
              updateGraph(updates);
            } catch (error) {
              console.error('Failed to parse JSON:', error);
            }
          });
      })
  };

  const queryStatefulPrompt = async (prompt, apiKey) => {
    fetch('/TextbookKG/prompts/stateful.prompt')
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

            // document.getElementsByClassName("searchBar")[0].value = "";
            document.body.style.cursor = 'default';
            document.getElementsByClassName("generateButton")[0].disabled = false;
          }).catch((error) => {
            console.log(error);
            // alert(error);
          });
      })
  };

  const queryPrompt = async (text, apiKey, prompt) => {
    if (SELECTED_PROMPT === "STATELESS") {
      await queryStatelessPrompt(text, apiKey, prompt);
    } else if (SELECTED_PROMPT === "STATEFUL") {
      await queryStatefulPrompt(text, apiKey, prompt);
    } else {
      alert("Please select a prompt");
      document.body.style.cursor = 'default';
      document.getElementsByClassName("generateButton")[0].disabled = false;
    }
  }

  const queryPromptExt = async (prompt, apiKey) => {
    if (SELECTED_PROMPT === "STATELESS") {
      await queryStatelessPromptExt(prompt, apiKey);
    } else if (SELECTED_PROMPT === "STATEFUL") {
      await queryStatefulPrompt(prompt, apiKey);
    } else {
      alert("Please select a prompt");
      document.body.style.cursor = 'default';
      document.getElementsByClassName("generateButton")[0].disabled = false;
    }
  }

  function editEdgeLabel(graph, id, newLabel) {
    const edgeIndex = graph.edges.findIndex(edge => edge.id === id);
    if (edgeIndex === -1) {
      console.error(`Edge with id "${id}" not found.`);
      return graph;
    }
  
    const updatedEdge = {
      ...graph.edges[edgeIndex],
      label: newLabel,
      color: "#8A78FE"
    };
    const updatedEdges = [
      ...graph.edges.slice(0, edgeIndex),
      updatedEdge,
      ...graph.edges.slice(edgeIndex + 1)
    ];
    return {
      ...graph,
      edges: updatedEdges
    };
  }

  function deleteEdgeFunc(graph, id) {
    const edgeIndex = graph.edges.findIndex(edge => edge.id === id);
    if (edgeIndex === -1) {
      console.error(`Edge with id "${id}" not found.`);
      return graph;
    }
  
    const updatedEdges = [
      ...graph.edges.slice(0, edgeIndex),
      ...graph.edges.slice(edgeIndex + 1)
    ];
  
    return {
      ...graph,
      edges: updatedEdges
    };
  }

  function editNodeIdAndLabel(graph, id, newId, newLabel) {
    const nodeIndex = graph.nodes.findIndex(node => node.id === id);
    if (nodeIndex === -1) {
      console.error(`Node with id "${id}" not found.`);
      return graph;
    }
  
    const updatedNode = {
      ...graph.nodes[nodeIndex],
      id: newId,
      label: newLabel,
      color: "#8A78FE"
    };
    const updatedNodes = [
      ...graph.nodes.slice(0, nodeIndex),
      updatedNode,
      ...graph.nodes.slice(nodeIndex + 1)
    ];
  
    const updatedEdges = graph.edges.map(edge => {
      if (edge.from === id) {
        return {
          ...edge,
          from: newId
        };
      } else if (edge.to === id) {
        return {
          ...edge,
          to: newId
        };
      } else {
        return edge;
      }
    });
  
    return {
      ...graph,
      nodes: updatedNodes,
      edges: updatedEdges
    };
  }

  function deleteNodeFunc(graph, id) {
    setSelectedNodeFrom(null)
    setSelectedNodeTo(null)
    console.log(selectedNode)
    const nodeIndex = graph.nodes.findIndex(node => node.id === id);
    if (nodeIndex === -1) {
      console.error(`Node with id "${id}" not found.`);
      return graph;
    }
  
    const connectedEdges = graph.edges.filter(edge => edge.source === id || edge.target === id);
    const updatedEdges = graph.edges.filter(edge => !connectedEdges.includes(edge));
    const updatedNodes = [
      ...graph.nodes.slice(0, nodeIndex),
      ...graph.nodes.slice(nodeIndex + 1)
    ];
  
    return {
      nodes: updatedNodes,
      edges: updatedEdges
    };
  }

  function addNodeAndEdge(graph, nodes, edges) {
    const newGraph = {
      nodes: [...graph.nodes],
      edges: [...graph.edges]
    };
  
    // Create nodes
    nodes.forEach(node => {
      const newNode = {
        id: node.id,
        label: node.label,
        color: node.color
      };
  
      newGraph.nodes.push(newNode);
      console.log(newNode);
    });
    if (edges !== null) {
      edges.forEach(edge => {
        const newEdge = {
          from: edge.from,
          to: edge.to,
          label: edge.label,
          color: edge.color
        };
        newGraph.edges.push(newEdge);
        console.log(newEdge);
      });
    }
    // Create edges
  
    setGraphState(newGraph);
  }

  const deleteEdge = () => {
    setGraphState(deleteEdgeFunc(graphState, selectedEdge));
    alert("The edge " + selectedEdge + " is deleted");
  }

  const editNodeAndEdge = () => {
    const modifiedNodeFrom = document.getElementsByClassName("node1Add")[0].value;
    const modifiedEdgeLabel = document.getElementsByClassName("edgeAdd")[0].value;
    const modifiedNodeTo = document.getElementsByClassName("node2Add")[0].value;
    if (modifiedEdgeLabel !== "" && modifiedEdgeLabel !== selectedEdgeLabel) {
      setGraphState(graphState => editEdgeLabel(graphState, selectedEdge, modifiedEdgeLabel));
    }
    if (modifiedNodeFrom !== "" && modifiedNodeFrom !== selectedNodeFrom) {
      setGraphState(graphState => editNodeIdAndLabel(graphState, selectedNodeFrom, modifiedNodeFrom, modifiedNodeFrom));
    }
    if (modifiedNodeTo !== "" && modifiedNodeTo !== selectedNodeTo) {
      setGraphState(graphState => editNodeIdAndLabel(graphState, selectedNodeTo, modifiedNodeTo, modifiedNodeTo));
    }
    const alerts = [];
    if (modifiedEdgeLabel !== "" && modifiedEdgeLabel !== selectedEdgeLabel) {
      alerts.push(`The label of edge ${selectedEdgeLabel} has been changed to ${modifiedEdgeLabel}`);
    }
    if (modifiedNodeFrom !== "" && modifiedNodeFrom !== selectedNodeFrom) {
      alerts.push(`The id and label of node ${selectedNodeFrom} have been changed to ${modifiedNodeFrom}`);
    }
    if (modifiedNodeTo !== "" && modifiedNodeTo !== selectedNodeTo) {
      alerts.push(`The id and label of node ${selectedNodeTo} have been changed to ${modifiedNodeTo}`);
    }
  
    if (alerts.length > 0) {
      alert(alerts.join("\n"));
    }
  };

  const deleteNode = () => {
      setGraphState(deleteNodeFunc(graphState, selectedNode));
      alert("The node " + selectedNode + " is deleted");
    
  }

  const createNodeEdge = () => {
    const node1Add = document.getElementsByClassName("node1Add")[0].value;
    const edgeAdd = document.getElementsByClassName("edgeAdd")[0].value;
    const node2Add = document.getElementsByClassName("node2Add")[0].value;

    console.log(node1Add, edgeAdd, node2Add);

    var nodes = null;
    if (node1Add !== "") {
      nodes = [{ id: node1Add, label: node1Add, color: '#FCE238' }]
    }

    if (node2Add !== "") {
      nodes = [
        { id: node1Add, label: node1Add, color: '#FCE238' },
        { id: node2Add, label: node2Add, color: '#FCE238' }
      ]
    }

    var edges = null;
    if (edgeAdd !== "") {
      edges = [
        { from: node1Add, to: node2Add, label: edgeAdd, color: '#FCE238' },
      ];
    }

    console.log(nodes, edges);

    addNodeAndEdge(graphState, nodes, edges);
  }

  const handleSave = (save_path) => {
    const blob = new Blob([JSON.stringify(graphState, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, save_path);
  };
  const delay = ms => new Promise(res => setTimeout(res, ms));

  const resumeGraph = () => {
    let file_path = `https://storage.googleapis.com/textbook_kg/knowledge_graphs/${selectedSection.replaceAll(" ", "_")}.json`;
    
    fetch(file_path, { method: 'GET'})
      .then(response => {
        if (response.ok) {
          console.log(`The file "${file_path}" exists.`);
          fetch(file_path)
          .then(response => response.json())
          .then(graph => setGraphState(graph))
        } else {
          // load KG from firebase
          const storage = getStorage(fireBase)
          const path = "knowledge_graphs"
          const objectName = `${path}/${selectedSection.replaceAll(' ', '_')}.json`;
          const storageRef = ref(storage, objectName);
    
          getDownloadURL(storageRef)
          .then((url) => {
            // Use the fetch API to load the contents of the file as JSON
            fetch(url)
              .then(response => response.json())
              .then(graph => setGraphState(graph));
          })
          .catch((error) => {
            console.error('Fail to load from firebase', error);
          });
        }
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
    
  }

  const outputGraph = () => {
    handleSave(`${selectedSection.replaceAll(' ', '_')}.json`);
  }

  // Google Login & Identity Services
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState("Logged Out");
  const [userRepoOptions, setUserRepoOptions] = useState([])
  const [selectedFile, setSelectedFile] = useState(null);
  const [openAIAPIKey, setopenAIAPIKey] = useState(null);

  const handleSelected = (selectedOption) => {
    setSelectedFile(selectedOption);
    console.log(selectedFile);
  }

  const handleSelectedFile = () => {
    // setSelectedFile(selectedOption);
    console.log(selectedFile);
    const kg_file_name = selectedFile[0];
    console.log(kg_file_name)
    const path = "kg_users"
    const objectName = `${path}/${user.email}/${kg_file_name}`;
    const storage = getStorage(fireBase)
    const storageRef = ref(storage, `/${objectName}`);

    // if the file is a project file
    if (kg_file_name.endsWith('.project')) {
      const graphStorageRef = ref(storage, `/${objectName}/graph.json`);
      const promptStorageRef = ref(storage, `/${objectName}/prompt.prompt`);
      const pdfStorageRef = ref(storage, `/${objectName}/pdf.pdf`);
      const textStorageRef = ref(storage, `/${objectName}/text.text`);
      const pageStorageRef = ref(storage, `/${objectName}/content_pages`);


      getDownloadURL(graphStorageRef)
      .then((url) => {
        fetch(url)
          .then(response => response.json())
          .then(graph => setGraphState(graph));
      })

      getDownloadURL(promptStorageRef)
      .then((url) => {
        fetch(url)
          .then(response => response.text())
          .then(text => setUserPrompt(text));
      })

      getDownloadURL(pdfStorageRef)
      .then((url) => {
        setPdfFile(url);
        setPageNumber(1);
        setIsFileUploaded(true);
      })

      getDownloadURL(textStorageRef)
      .then((url) => {
        fetch(url)
          .then(response => response.text())
          .then(text => setRawText(text));
      })

      getDownloadURL(pageStorageRef)
      .then((url) => {
        fetch(url)
          .then(response => response.text())
          .then(pages => setContentPage(pages));
      })
    }


    getDownloadURL(storageRef)
    .then((url) => {
      if (kg_file_name.endsWith('.json')) {
        // Use the fetch API to load the contents of the file as JSON
        fetch(url)
          .then(response => response.json())
          .then(graph => setGraphState(graph));
      } else if (kg_file_name.endsWith('.pdf')) {
        // Set the URL as the source for the PDF file
        setPdfFile(url);
        setPageNumber(1);
        setIsFileUploaded(true);
      } else if (kg_file_name.endsWith('.prompt')) {
        // Use the fetch API to load the contents of the file as text
        fetch(url)
          .then(response => response.text())
          .then(text => setUserPrompt(text));
      } else if (kg_file_name.endsWith('.text')) {
        // Use the fetch API to load the contents of the file as text
        fetch(url)
          .then(response => response.text())
          .then(text => setRawText(text));
      }
    })
    .catch((error) => {
      console.error('Fail to load from firebase', error);
    });
  };

  const deleteFile = () => {
    if (!selectedFile) {
      console.log('No file selected for deletion');
      return;
    }
  
    const kg_file_name = selectedFile[0];
    const path = "kg_users"
    const objectName = `${path}/${user.email}/${kg_file_name}`;
    const storage = getStorage(fireBase)
    const storageRef = ref(storage, `/${objectName}`);
  
    // Check if the selected item is a folder (ends with '.project')
    if (kg_file_name.endsWith('.project')) {
      // If it's a folder, list all objects under this folder and delete them
      listAll(storageRef).then(res => {
        const deletionPromises = [];
  
        // Delete all items (files) under this folder
        res.items.forEach(item => {
          deletionPromises.push(deleteObject(item));
        });
  
        // Optionally, delete all prefixes (sub-folders) recursively
        res.prefixes.forEach(prefix => {
          // Recursive call to delete sub-folders
          setSelectedFile([`${kg_file_name}/${prefix.name}/`]);
          deleteFile();
        });
  
        return Promise.all(deletionPromises);
      }).then(() => {
        console.log('Folder and its contents deleted successfully');
        setSelectedFile(null); // Reset selected file
        listFiles_self(user.email)
      }).catch(error => {
        console.error('Failed to delete folder contents from Firebase', error);
      });
    } else {
      // If it's a file, just delete it
      deleteObject(storageRef)
        .then(() => {
          console.log('File deleted successfully');
          setSelectedFile(null); // Reset selected file
          listFiles_self(user.email)
        })
        .catch((error) => {
          console.error('Failed to delete file from Firebase', error);
        });
    }
  };

  const handleRetrieveAPIKey = () => {
    // setSelectedFile(selectedOption);
    const storage = getStorage(fireBase)
    const storageRef = ref(storage, `kg_users/admin/apikey.key`);

    getDownloadURL(storageRef)
    .then((url) => {
      fetch(url)
        .then(response => response.text())
        .then(text => setopenAIAPIKey(text));
    })
    .catch((error) => {
      console.error('Fail to load OpenAIAPIKey', error);
    });
  };


  function handleUserRepoInit(email) {
    listFiles_self(email)
  }

  function refreshRepo(email) {
    listFiles_self(email)
  }

  const listFiles_self = (email) => {
    const path = "kg_users";
    const folderName = `${path}/${email}`;
    const storage = getStorage(fireBase);
    const listRef = ref(storage, folderName);
  
    listAll(listRef)
      .then((res) => {
        // List folders (prefixes)
        const folderPromises = res.prefixes.map((prefix) => ({
          name: prefix.name,
          value: prefix.name,
          isFolder: true
        }));
  
        // List files (items) and get their download URLs
        const filePromises = res.items.map((itemRef) => 
          getDownloadURL(itemRef).then((url) => ({
            name: itemRef.name,
            value: itemRef.name,
            isFolder: false
          }))
        );
  
        return Promise.all([...folderPromises, ...filePromises]);
      })
      .then((filesAndFoldersList) => {
        setUserRepoOptions(filesAndFoldersList); // change the state with React Hook
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function handleCallbackResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);  
    var userObject = jwt_decode(response.credential);
    console.log(userObject);
    setUser(userObject);
    setLoggedIn(userObject.name.split(' ')[0]);
    handleRetrieveAPIKey();
    handleUserRepoInit(userObject.email);
  }

  function handleSignOut(event) {
    setUser(null);
    setLoggedIn("Logged Out");
    setUserRepoOptions(0);
  }

  useEffect(() => {
    /* global google*/
    google.accounts.id.initialize({
      client_id: "497566497653-8pje9meu5q10ch9vro2nuept9bdacgu5.apps.googleusercontent.com",
      callback: handleCallbackResponse
    });

    google.accounts.id.renderButton(
      document.getElementById("signInDiv"),
      { shape:'rectangular', size:'large', theme:'filled_blue', type:'icon'}
      // { shape:'rectangular', size:'small', theme:'outline'}
    );
  }, [])



  const nodeOptions = graphState.nodes.map((node) => ({
    name: node.label,
    value: node.id,
  }));

  const [filteredEdges, setFilteredEdges] = useState(null);

  const edgeOptions = filteredEdges !== null ? filteredEdges.map((edge) => ({
    name: edge.label,
    value: edge.id,
  })) : graphState.edges.map((edge) => ({
    name: edge.label,
    value: edge.id,
  }));

  const [disableNodeAnimation, setDisableNodeAnimation] = useState(true)
  const [disableEdgeAnimation, setDisableEdgeAnimation] = useState(true)

  const handleNodeFromSelect = (value) => {
    setSelectedNodeFrom(value[0]);
    if (value.length > 0) { 
      const edges = graphState.edges.filter(edge => edge.from === value[0]);
      setDisableNodeAnimation(false)
      setFilteredEdges(edges);
    } else {
      setFilteredEdges(null);
    }
  };

  const handleEdgeSelect = (value) => {
    setSelectedEdge(value[0]);
    if (value.length > 0) { 
      setDisableEdgeAnimation(false);
    } else {
      setDisableEdgeAnimation(true);
    }
  };

  const handleNodeToSelect = (value) => {
    setSelectedNodeTo(value[0]); 
    if (value.length > 0) { 
      const edges = graphState.edges.filter(edge => edge.to === value[0]);
      setDisableNodeAnimation(false)
      setFilteredEdges(edges);
    } else {
      setFilteredEdges(null);
    }
  };

  const [searchResults, setSearchResults] = useState([]);
  const [showResultsBox, setShowResultsBox] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleWikiSearch = (node) => {
    // Call the Wikipedia API
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${node}&utf8=&format=json&origin=*`)
        .then(response => response.json())
        .then(data => {
            setSearchResults(data.query.search);
            setShowResultsBox(true);
        });
    console.log(node);
    console.log(searchResults);

};


  const [showSelectSearchBox, setShowSelectSearchBox] = useState(false);

  const toggleSelectSearchBox = () => {
    setShowSelectSearchBox(!showSelectSearchBox);
  };

  const [showUserRepo, setShowUserRepo] = useState(true);

  const toggleUserRepoBox = () => {
    setShowUserRepo(!showUserRepo);
  };

  const [percent, setPercent] = useState(0);


  // upload graph 
  const uploadGraph_textbook = () => {
    if (user === null) {
      alert("Please login your google account first!")
      return
    }

    const path = "knowledge_graphs"
    const objectName = `${path}/${selectedSection.replaceAll(' ', '_')}.json`;

    const file = new Blob([JSON.stringify(graphState, null, 2)], { type: 'application/json;charset=utf-8' });
    const storage = getStorage(fireBase)
    const storageRef = ref(storage, `/${objectName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
      
            // update progress
            setPercent(percent);
        },
          (err) => console.log(err),
          () => {
          // download url
              getDownloadURL(uploadTask.snapshot.ref).then((url) => {
              console.log(url);
              return;
          });
          }
        );
      alert(`/${objectName} has been successfully uploaded to firebase!`);

  }

  const uploadGraph_self = () => {
    if (user === null) {
      alert("Please login your google account first!")
      return
    }
    const file_name = document.getElementsByClassName("kgFileName")[0].value;
    const path = "kg_users"
    const objectName = `${path}/${user.email}/${file_name}.json`;

    const file = new Blob([JSON.stringify(graphState, null, 2)], { type: 'application/json;charset=utf-8' });
    const storage = getStorage(fireBase)
    const storageRef = ref(storage, `/${objectName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
      
            // update progress
            setPercent(percent);
        },
          (err) => console.log(err),
          () => {
          // download url
              getDownloadURL(uploadTask.snapshot.ref).then((url) => {
              console.log(url);
              return;
          });
          }
        );
      listFiles_self(user.email)
      alert(`/${objectName} has been successfully uploaded to firebase!`);

  }

  const uploadPDF_Cloud = () => {
    if (user === null) {
      alert("Please login your google account first!")
      return;
    }
    if (!uploadedFile) {
      alert("Please upload a PDF file first!")
      return;
    }
    
    const file_name = document.getElementsByClassName("pdfFileName")[0].value;
    const path = "kg_users";
    const objectName = `${path}/${user.email}/${file_name}.pdf`;
  
    const storage = getStorage(fireBase);
    const storageRef = ref(storage, `/${objectName}`);
    const uploadTask = uploadBytesResumable(storageRef, uploadedFile); // upload the uploadedFile
  
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
  
        // update progress
        setPercent(percent);
      },
      (err) => console.log(err),
      () => {
        // download url
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          console.log(url);
          return;
        });
      }
    );
    listFiles_self(user.email)
    alert(`/${objectName} has been successfully uploaded to firebase!`);
  };


  const uploadPrompt = () => {
    if (user === null) {
      alert("Please login your google account first!")
      return;
    }
    
    const file_name = document.getElementsByClassName("promptFileName")[0].value;
    const text_prompt = document.getElementsByClassName("promptText")[0].value;
    const path = "kg_users";
    const objectName = `${path}/${user.email}/${file_name}.prompt`;

    const file = new Blob([text_prompt], { type: 'text/plain;charset=utf-8' }); // convert the text to a blob

    const storage = getStorage(fireBase);
    const storageRef = ref(storage, `/${objectName}`);
    const uploadTask = uploadBytesResumable(storageRef, file); // upload the blob
  
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
  
        // update progress
        setPercent(percent);
      },
      (err) => console.log(err),
      () => {
        // download url
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          console.log(url);
          return;
        });
      }
    );
    listFiles_self(user.email)
    alert(`/${objectName} has been successfully uploaded to firebase!`);
};


const uploadText = () => {
  if (user === null) {
    alert("Please login your google account first!")
    return;
  }
  
  const file_name = document.getElementsByClassName("textFileName")[0].value;
  const text_content = rawText
  const path = "kg_users";
  const objectName = `${path}/${user.email}/${file_name}.text`;

  const file = new Blob([text_content], { type: 'text/plain;charset=utf-8' }); // convert the text to a blob

  const storage = getStorage(fireBase);
  const storageRef = ref(storage, `/${objectName}`);
  const uploadTask = uploadBytesResumable(storageRef, file); // upload the blob

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const percent = Math.round(
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      );

      // update progress
      setPercent(percent);
    },
    (err) => console.log(err),
    () => {
      // download url
      getDownloadURL(uploadTask.snapshot.ref).then((url) => {
        console.log(url);
        return;
      });
    }
  );
  listFiles_self(user.email)
  alert(`/${objectName} has been successfully uploaded to firebase!`);
};

const uploadProjectFile = async () => {
  const file_name = document.getElementsByClassName("projectFileName")[0].value;
  const path = "kg_users";
  const storage = getStorage(fireBase);


  const text_content = rawText
  const textName = `${path}/${user.email}/${file_name}.project/text.text`;
  const textFile = new Blob([text_content], { type: 'text/plain;charset=utf-8' }); 
  const textStorageRef = ref(storage, `/${textName}`);
  const textUploadTask = uploadBytesResumable(textStorageRef, textFile); 

  const content_pages = contentPage
  const contentName = `${path}/${user.email}/${file_name}.project/content_pages`;
  const contentPageFile = new Blob([content_pages], { type: 'text/plain;charset=utf-8' }); 
  const pageStorageRef = ref(storage, `/${contentName}`);
  const pageUploadTask = uploadBytesResumable(pageStorageRef, contentPageFile); 

  const prompt_content = document.getElementsByClassName("promptText")[0].value;
  const promptName = `${path}/${user.email}/${file_name}.project/prompt.prompt`;
  const promptFile = new Blob([prompt_content], { type: 'text/plain;charset=utf-8' });
  const promptStorageRef = ref(storage, `/${promptName}`);
  const promptUploadTask = uploadBytesResumable(promptStorageRef, promptFile);

  const pdfName = `${path}/${user.email}/${file_name}.project/pdf.pdf`;
  const pdfStorageRef = ref(storage, `/${pdfName}`);
  const pdfUploadTask = uploadBytesResumable(pdfStorageRef, uploadedFile); // upload the uploadedFile

  const graphName = `${path}/${user.email}/${file_name}.project/graph.json`;
  const graphFile = new Blob([JSON.stringify(graphState, null, 2)], { type: 'application/json;charset=utf-8' });
  const graphStorageRef = ref(storage, `/${graphName}`);
  const graphUploadTask = uploadBytesResumable(graphStorageRef, graphFile); // upload the uploadedFile



  const allUploadTasks = [
    { task: textUploadTask, name: "text" },
    { task: pageUploadTask, name: "content_pages" },
    { task: promptUploadTask, name: "prompt" },
    { task: pdfUploadTask, name: "pdf" },
    { task: graphUploadTask, name: "graph" }
  ];

  const allProgress = {};

  allUploadTasks.forEach(({ task, name }) => {
    allProgress[name] = 0;

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        allProgress[name] = percent;

        // Calculate total progress
        const totalPercent = Math.round(
          Object.values(allProgress).reduce((acc, val) => acc + val, 0) /
            Object.keys(allProgress).length
        );

        // Update progress for the whole batch of uploads
        setPercent(totalPercent);
      },
      (err) => console.log(err, `Error uploading ${name}`),
      () => {
        getDownloadURL(task.snapshot.ref).then((url) => {
          console.log(`${name} uploaded to: ${url}`);
        });
      }
    );
  });

  // Waiting for all uploads to complete using Promise.all()
  const completionPromises = allUploadTasks.map(({ task }) =>
    new Promise((resolve, reject) => {
      task.then(
        (snapshot) => resolve(snapshot),
        (error) => reject(error)
      );
    })
  );

  try {
    await Promise.all(completionPromises);
    console.log("All files uploaded successfully!");
    // listFiles_self(user.email)   // Call this if needed
  } catch (error) {
    console.log("Error uploading one or more files:", error);
  }
};
  
const [currentIndex, setCurrentIndex] = useState(-1); // Start with -1 to indicate no action

useEffect(() => {
  let apiKey;
  if (!user) {
      apiKey = document.getElementsByClassName("apiKeyTextField")[0].value;
  } else {
      apiKey = openAIAPIKey;
  }  

  const processQuery = async () => {
    try {
      if (currentIndex >= 0 && currentIndex < selectedText.length) {
          console.log(selectedText[currentIndex]);
          await queryPrompt(selectedText[currentIndex], apiKey, userPrompt);
      } else if (currentIndex >= selectedText.length) {
          console.log("All queries have been processed");
          document.body.style.cursor = 'default'; 
          document.getElementsByClassName("generateButton")[0].disabled = false;
      }
    } catch (error) {
      console.error("Error during queryPrompt:", error);
      document.body.style.cursor = 'default'; 
      document.getElementsByClassName("generateButton")[0].disabled = false;
      setCurrentIndex(-1);
    }
  }

  processQuery();

}, [currentIndex]);


useEffect(() => {
    if (currentIndex >= 0 && currentIndex < selectedText.length) {
        setCurrentIndex(prevIndex => prevIndex + 1);
    }
}, [graphState]);

const regenerateGraph = async () => {
  document.body.style.cursor = 'wait';
  document.getElementsByClassName("generateButton")[0].disabled = true;
  if (selectedText.length === 0) {
    document.body.style.cursor = 'default';
    console.log("No selected quality text to prompt the graph ...");
  } else {
    setCurrentIndex(0);
  }
  
}

  //
  // Start Textbook PDF Viewer module
  //

  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedText, setSelectedText] = useState([null]);
  const [rawText, setRawText] = useState('');
  const [inSections, setInSections] = useState([]);
	const [numPages, setNumPages] = useState(null);
	const [pageNumber, setPageNumber] = useState(1);
  const [inputValue, setInputValue] = useState(pageNumber.toString());
	const [pdfFile, setPdfFile] = useState('/TextbookKG/textbook-1.pdf');
  const [chapters, setChapters] = useState([]);
  const [docSize, setDocSize] = useState(1.1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [showDropdowns, setShowDropdowns] = useState(false);
  const [contentPage, setContentPage] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);


  const pdfjsLib = require('pdfjs-dist/build/pdf');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js';

  async function extractTextFromPDF(url, pageNumber) {
    const pdf = await pdfjsLib.getDocument(url).promise;
    let textContent = '';
    const page = await pdf.getPage(pageNumber);
    const textContentObj = await page.getTextContent();
    const strings = textContentObj.items.map(item => item.str);
    textContent += strings.join(' ') + "\n";
    textContent = "===\n" + textContent + "===\n";
    
    return textContent;
  }

  async function extractTextFromPDF_OCR(url, pageNumber) {
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 3.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const imageUrl = canvas.toDataURL();

    console.log(imageUrl);

    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          setOcrProgress(m.progress);
        }
      }
    });
    let textContent = result.data.text;
    textContent = "===\n" + textContent + "===\n";
    return textContent;
  }

  

  useEffect(() => {
    fetch('/TextbookKG/page_info.json')
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

  useEffect(() => {
    if (!showDropdowns) {
      clearState()
    }
  }, [showDropdowns]);

  useEffect(() => {
    if (showDropdowns && selectedChapter && pageNumber) {
      let selectedSection;
      let inSections = Object.entries(selectedChapter["in_sections"]);
      for (let i = 0; i < inSections.length; i++) {
        let currentSection = inSections[i];
        let nextSection = inSections[i + 1];
        if (nextSection && pageNumber >= currentSection[1] && pageNumber < nextSection[1]) {
          selectedSection = currentSection[0];
          break;
        } else if (!nextSection && pageNumber >= currentSection[1]) {
          selectedSection = currentSection[0];
          break;
        }
      }
      setSelectedSection(selectedSection);
    }
  }, [pageNumber, selectedChapter]);

  // Use "===" to label the text we want to convert
  function extractTextBetweenDelimiters(text) {
    let regex = /===([\s\S]*?)===/g;
    let matches = [];
    let match;
  
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1].trim().replaceAll('\n', ' '));
    }
  
    if (matches.length === 0 && typeof text === 'string' && text.length > 0) {
      // divide the text into smaller chunks of 500 tokens
      let tokens = text.split(' ');
      for (let i = 0; i < tokens.length; i += 800) {
        matches.push(tokens.slice(i, i + 800).join(' '));
      }
    }
  
    return matches;
  }

  useEffect(() => {
    if (selectedSection) {
      let chapter_num = Array.from(Array.from(Array.from(Object.entries(selectedChapter["in_sections"]))[0])[0])[0];
      let chapter_name = `CHAPTER_${chapter_num}_${selectedChapter.name}`;
      let file_path = `/TextbookKG/textbooks/${chapter_name}/${selectedSection.replaceAll(" ", "_")}.txt`;
      
      console.log(chapter_name);
      console.log(selectedSection);
      console.log(file_path)
      fetch(file_path)
      .then(response => response.text())
      .then(TEXT => setRawText(TEXT));
    
      clearState()
      resumeGraph()
      console.log(selectedText);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (rawText) {
      setSelectedText(extractTextBetweenDelimiters(rawText));
      console.log(selectedText)
    }
  }, [rawText]);

	const onDocumentLoadSuccess = ({ numPages }) => {
		setNumPages(numPages);
	};

	const zoomIn = () =>
		setDocSize(docSize + 0.1 > 2.0 ? 2.0 : docSize + 0.1);

	const zoomOut = () =>
    setDocSize(docSize - 0.1 < 0.5 ? 0.5 : docSize - 0.1);

  const goToPrevPage = () =>
		setPageNumber(pageNumber - 1 <= 1 ? 1 : pageNumber - 1);

	const goToNextPage = () =>
		setPageNumber(
			pageNumber + 1 >= numPages ? numPages : pageNumber + 1,
		);

    const handlePageNumberChange = (event) => {
      setInputValue(event.target.value);
    };

    const validatePageNumber = () => {
      const newPageNumber = parseInt(inputValue, 10);
      if (newPageNumber >= 1 && newPageNumber <= numPages) {
          setPageNumber(newPageNumber);
      } else {
          setInputValue(pageNumber.toString()); // Reset to the previous valid value
      }
    };

  const handleAddContent = () => {
    setContentPage(contentPage + pageNumber.toString() + ', ');
    extractTextFromPDF(pdfFile, pageNumber).then((text) => {
      setRawText(rawText + text);
    })
  }

  const handleAddContent_OCR = () => {
    setContentPage(contentPage + pageNumber.toString() + ', ');
    extractTextFromPDF_OCR(pdfFile, pageNumber).then((text) => {
      setRawText(rawText + text);
    })
  }

  const handleClearContent = () => {
    setContentPage('');
    setRawText('');
  }

  const handleChapterSelect = (eventKey) => {
    fetch('/TextbookKG/page_info.json')
      .then(response => response.json())
      .then(jsonData => {
        setSelectedChapter(jsonData[`CHAPTER_${eventKey}`]);
        setPdfFile(`/TextbookKG/textbook-${eventKey}.pdf`);
        setPageNumber(1);
      });
  };

  const handleSectionSelectPage = (eventKey) => {
    let page_num = parseInt(eventKey)
    setPageNumber(page_num);
  };

  const handleSectionSelectKey = (eventKey) => {
    setSelectedSection(eventKey.replaceAll(' ', '_'));
    console.log(selectedSection); 
  }

  const handleSectionSelect = (eventKey) => {
    handleSectionSelectPage(eventKey.split('_')[1]);
    handleSectionSelectKey(eventKey.split('_')[0]);
  };

  // const { win_height, win_width } = useWindowDimensions();
  const win_width = Dimensions.get('window').width;
  const win_height = Dimensions.get('window').height;

  const textareaRef = useRef(null);
  useEffect(() => {
    if (selectedNode && textareaRef.current) {
      const start = rawText.indexOf(selectedNode);
      if (start !== -1) {
        const end = start + selectedNode.length;
        textareaRef.current.selectionStart = start;
        textareaRef.current.selectionEnd = end;
        textareaRef.current.focus(); // This makes sure the selection is visible to the user.
      }
    }
  }, [selectedNode, rawText]);


  const handleTextSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = rawText.slice(start, end);
      
      // Fuzzy search for nodes
      const options = {
        keys: ['from', 'to'], // You can add more keys if needed
        threshold: 0.4 // Adjust the threshold for fuzziness
      };
      const fuse = new Fuse(graphState.edges, options);
      const results = fuse.search(selectedText);
  
      // If there's a match, select and focus the first result (you can adjust as needed)
      if (results.length) {
        const firstMatchedEdge = results[0].item;
        graphRef.current.Network.selectNodes([firstMatchedEdge.from, firstMatchedEdge.to]);
        graphRef.current.Network.focus(firstMatchedEdge.from, animationOptions); // Adjust as per your needs
      }
    }
  };

	return (
		<div style={{ display: 'flex', flexDirection: 'row'}}>
      <div className='pdf_viewer'>
        <nav style={{ display: 'flex', flexDirection: 'row'}}>
            <nav style={{ display: 'flex', flexDirection: 'column'}}>
              <nav style={{ display: 'flex', alignItems: 'center' }}>
                  <div className='uploadPDFButton'>
                    <input 
                      id="fileUpload" // add an id to the input
                      style={{display: 'none'}} // hide the input
                      type='file'
                      onChange={(event) => {
                        const fileURL = URL.createObjectURL(event.target.files[0]);
                        setUploadedFile(event.target.files[0]);
                        setPdfFile(fileURL);
                        setPageNumber(1);
                        setIsFileUploaded(true);
                        console.log(userPrompt)
                      }}
                      accept=".pdf"
                    />
                    <label htmlFor="fileUpload">PDF Upload</label> {/* add a label that triggers the hidden input when clicked */}
                  </div>
                    <button className='textbookButton' onClick={() => setShowDropdowns(!showDropdowns)}>Built-in Textbooks</button>

                  {showDropdowns && (
                    <>
                      <DropdownButton onSelect={handleChapterSelect} id="dropdown-basic-button" title="Select Chapter">
                        {chapters.map((chapter) => (
                          <Dropdown.Item key={chapter[0]} eventKey={parseInt(chapter[0].split("_")[1], 10)}>
                            Chapter {parseInt(chapter[0].split("_")[1], 10)}: {chapter[1].name.replaceAll("_", " ")}
                          </Dropdown.Item>
                        ))}
                      </DropdownButton>{" "}
                      <DropdownButton onSelect={handleSectionSelect} id="dropdown-basic-button" title="Select Section">
                        {inSections.map((section) => (
                          <Dropdown.Item key={section[0]} eventKey={section[0] + '_' + section[1]}>
                            {section[0]}
                          </Dropdown.Item>
                        ))}
                      </DropdownButton>
                    </>
                  )}

              </nav>

              <nav style={{ display: 'flex', alignItems: 'center' }}>
                <button className='pdfpagezoomButton' onClick={zoomOut}>➖</button>
                <button className='pdfpagezoomButton' onClick={zoomIn}>➕</button>
                <button className='pdfpagechangeButton' onClick={goToPrevPage}>Prev</button>
                <button className='pdfpagechangeButton' onClick={goToNextPage}>Next</button>
                <Form.Control
                    type="text"
                    value={inputValue}
                    onChange={handlePageNumberChange}
                    onBlur={validatePageNumber}
                    style={{ width: '10%' }}
                />

                 <p style={{ width: '50%' }}>
                ✨ Page {pageNumber} of {numPages} ✨ {showDropdowns && (<span style={{ fontWeight: 'bold' }}>{selectedSection}</span>)}
                </p>

              </nav>
            </nav>

          </nav>
            
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            <Page scale={docSize} pageNumber={pageNumber} renderTextLayer={false}/>
          </Document>
          {isFileUploaded && !showDropdowns && (
          <div className='textButtonBox' style={{ display: 'flex', flexDirection: 'row'}}>
            { (
              <button className='addContentButton' onClick={handleAddContent}>Copy To 📖 Text</button>
            )}
            { (
              <button className='ocrContentButton' onClick={handleAddContent_OCR}>OCR To 📖 Text</button>
            )}
            { (
              <button className='clearListButton' onClick={handleClearContent}>Clear</button>
            )}
            { <input className="pdfFileName" placeholder="PDF file name"></input>}
            { (
            <button className="uploadPDFCloudButton" onClick={uploadPDF_Cloud}>Save PDF</button>
            )}
          </div>
          )}

          { (
            <div className="ocrProgressContainer">
              <p>
                ✨ OCR Progress ✨
              </p>
              <progress id="ocrProgressBar" value={ocrProgress} max="1"></progress>
            </div>
          )}
          <div className='prompyContainer' style={{ display: 'flex', flexDirection: 'column'}}>
          <h1 className="headerPrompt" width={win_width * 0.5} height={win_height * 0.1}> 🔍 Prompt </h1>
          <textarea
            className='promptText'
            value={userPrompt} // ...force the input's value to match the state variable...
            onChange={e => setUserPrompt(e.target.value)} // ... and update the state variable on any edits!
          />
          {/* <h1 className="instruction"><img src={require('./instruction.png')} width='100%' height="100%" /></h1> */}
          </div>

          <div className='promptButtonBox' style={{ display: 'flex', flexDirection: 'row'}}>
            <button className="resetPromptButton" onClick={initPrompt}>Reset</button>
            { <input className="promptFileName" placeholder="prompt file name"></input>}
            <button className="uploadPromptButton" onClick={uploadPrompt}>Save Prompt</button>
          </div>

      </div>
      <div className='kg_sidetoolbar_textbox'>

      <Draggable handle=".drag-handle">
      <div className="kg_sidetoolbar">
      <div className='sideToolBar' style={{ display: 'flex', flexDirection: 'column'}}>
        
                    <div className='loginContainer' style={{ display: 'flex', flexDirection: 'column'}}>
                          <div id="signInDiv"></div>
                          <button className='logoutButton' onClick={handleSignOut}>LogOut</button>
                          <p className='loginStatus'> {loggedIn} </p>
                    </div>
                    <div className='selectSearchBoxMain' style={{ display: 'flex', flexDirection: 'column'}}>
                      <button className='listButton' onClick={toggleSelectSearchBox}>
                        {showSelectSearchBox ? 'Hide' : 'Show'} N/E List
                      </button>
                      {showSelectSearchBox && (
                        <div className='selectSearchBox' style={{ display: 'flex', flexDirection: 'column'}}>
                            <SelectSearch
                              options={nodeOptions}
                              value={[selectedNodeFrom]}
                              onChange={handleNodeFromSelect}
                              placeholder="Select a node (from)"
                              search
                              multiple
                              emptyMessage="No nodes found"
                            />
                            <SelectSearch
                              options={edgeOptions}
                              value={[selectedEdge]}
                              onChange={handleEdgeSelect}
                              placeholder="Select an edge"
                              search
                              multiple
                              emptyMessage="No edges found"
                            />
                            <SelectSearch
                              options={nodeOptions}
                              value={[selectedNodeTo]}
                              onChange={handleNodeToSelect}
                              placeholder="Select a node (to)"
                              search
                              multiple
                              emptyMessage="No nodes found"
                            />
                          </div>
                        )}
                    </div>
                    {user &&
                      <div className='userLibrary' style={{ display: 'flex', flexDirection: 'column'}}>
                        <button className='listButtonRepo' onClick={toggleUserRepoBox}>
                          {showUserRepo ? 'Hide' : 'Show'} User Repo
                        </button>
                        {showUserRepo && (
                          <div className='selectSearchBox' style={{ display: 'flex', flexDirection: 'column'}}>
                              <SelectSearch
                                options={userRepoOptions}
                                value={[selectedFile]}
                                onChange={handleSelected}
                                placeholder="Select a file"
                                search
                                multiple
                                emptyMessage="No file found"
                              />
                            </div>
                          )}
                      </div>
                    }
                    {user  && showUserRepo && 
                    <div className='repoButtonBox' style={{ display: 'flex', flexDirection: 'column'}}>
                      <div className='promptButtonBox' style={{ display: 'flex', flexDirection: 'row'}}>
                        <button className="loadFileButton" onClick={handleSelectedFile}>Load</button>
                        <button className="refreshRepoButton" onClick={refreshRepo(user.email)}>Refresh</button>
                        <button className="deleteFileButton" onClick={deleteFile}>Delete</button>
                      </div>
                      <div className='promptButtonBox' style={{ display: 'flex', flexDirection: 'row'}}>
                      { <input className="projectFileName" placeholder="project name"></input>}
                      <button className="uploadProjectButton" onClick={uploadProjectFile}>Save Project</button>
                      </div>
                    </div>
                      
                      }

          </div>
      
      <div className='knowledge_graph'>
            <Resizable
                defaultSize={{
                    width: '100%',
                    height: '34%',
                }}
                maxWidth="200%" // or any other value you prefer
                minWidth="40%"  // or any other value you prefer
                maxHeight="200%" // existing value
                minHeight="34%"  // existing value
            >
        <div>
        <div className="drag-handle" style={{ cursor: 'move', padding: '5px', backgroundColor: '#F2FAF9', borderBottom: '1px solid #ccc' }}>
        <nav>
          <h2 className="dragger_0" width={win_width * 0.5} height={win_height * 0.1}> 
                      ⠿
          </h2>
          <h2 className="headerText" width={win_width * 0.5} height={win_height * 0.1}> 
              <span style={{ textShadow: '0px 0px 1px purple' }}>🕸️</span> Knowledge Graph 
          </h2>
        </nav>
        <div className='contentList'>
          {!showDropdowns &&(<h1 style={{ fontSize: '14px' }} className="contentText">Contained Page(s): {contentPage}</h1>)}
        </div>
        </div>

        <div className='graphContainer' style={{ width: '100%', height: '100%' }}>
            <Graph graph={graphState} ref={graphRef} options={options} events={eventState} style={{ height: win_height * 0.75 }} />
            <div className='curInfoContainer' style={{ display: 'flex', flexDirection: 'row'}}>
                <p><pre>
                    Selected Node: <span style={{ fontWeight: 'bold' }}>{selectedNode}</span> {"\n"}
                    Nodes From|To: <span style={{ fontWeight: 'bold' }}>{selectedNodeFrom} | {selectedNodeTo}</span> {"\n"}
                    Selected Edge: <span style={{ fontWeight: 'bold' }}>{selectedEdgeLabel}</span>
                </pre></p>
                
                <button 
                  className={`hierarchicalButton ${isHierarchical ? "hierarchicalTrue" : "hierarchicalFalse"}`}
                  onClick={() => setIsHierarchical(prevState => !prevState)}
                >
                  Hierarchical: {isHierarchical ? "True" : "False"}
                </button>
                <WikiResultsBox className="wikiResultsBox" results={searchResults} show={showResultsBox} onClose={() => setShowResultsBox(false)} />
                <button className="wikiButton" onClick={() => handleWikiSearch(selectedNode)}>Search</button>
            </div>
        </div>

         

        <div className='inputContainer1'>
          <div className='nodeEdgeBox' style={{ display: 'flex', flexDirection: 'column'}}>
            <input className="node1Add" placeholder="Node (from)"></input>
            <input className="edgeAdd" placeholder="Edge"></input>
            <input className="node2Add" placeholder="Node (to)"></input>
          </div>
          <div className='nodeEdgeButtonBox' style={{ display: 'flex', flexDirection: 'column'}}>
            <div className='createModifyButtonBox' style={{ display: 'flex', flexDirection: 'row'}}>
              <button className="modifyButton" onClick={editNodeAndEdge}>Modify</button>
              <button className="createButton" onClick={createNodeEdge}>Create</button>
            </div>
            <div className='deleteButtonBox' style={{ display: 'flex', flexDirection: 'row'}}>
              <button className="deleteNodeButton" onClick={deleteNode}>Delete Node</button>
              <button className="deleteEdgeButton" onClick={deleteEdge}>Delete Edge</button>
            </div>
          </div>
          
          <div className='generalButtonBox' style={{ display: 'flex', flexDirection: 'column'}}>
            <div className='innerContainer1' style={{ display: 'flex', flexDirection: 'row'}}>
              <button className="resumeButton" onClick={resumeGraph}>Reset</button>
              <button className="clearButton" onClick={clearState}>Clear</button>
              <button className="outputButton" onClick={outputGraph}>Download</button>

              {!showDropdowns && <input className="kgFileName" placeholder="file name"></input>}
              {showDropdowns && <button className="uploadButton" onClick={uploadGraph_textbook}>Save</button>}
              {!showDropdowns && <button className="uploadButton" onClick={uploadGraph_self}>Save</button>}
            </div>
            <div className='innerContainer2' style={{ display: 'flex', flexDirection: 'row'}}>        
              { !user && <input className="apiKeyTextField" type="password" placeholder="OpenAI API key ..."></input> }
              <button className="generateButton" onClick={regenerateGraph}>
                {currentIndex >= 0 && currentIndex < selectedText.length ? 
                  `Now Processing Text #${currentIndex + 1}` : 
                  'Generate'}
              </button>
            </div>

          </div>

        </div>
        </div>
        </Resizable>
        </div>
    </div>
    </Draggable>

        <div className='inputContainer2' style={{ display: 'flex', flexDirection: 'column'}}>
        <h1 className="headerTextbox" width={win_width * 0.5} height={win_height * 0.1}> 📖 Text</h1>
          <textarea
            ref={textareaRef}
            className='sectionText'
            value={rawText} // ...force the input's value to match the state variable...
            onChange={e => setRawText(e.target.value)} // ... and update the state variable on any edits!
            onSelect={handleTextSelect}
          />
          {/* <h1 className="instruction"><img src={require('./instruction.png')} width='100%' height="100%" /></h1> */}
        </div>
        <div className='textButtonBox_1' style={{ display: 'flex', flexDirection: 'row'}}>
                  <button className="resetTextButton" onClick={handleClearContent}>Clear Text</button>
                  { <input className="textFileName" placeholder="text file name"></input>}
                  <button className="uploadTextButton" onClick={uploadText}>Save Text</button>
        </div>
        <p className='footer'>Developed by Patrick Jiang @ UIUC</p>
      </div>
      </div>

	);





}



export default App;
