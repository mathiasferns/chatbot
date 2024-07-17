class LangflowClient {
  constructor(baseURL, apiKey) {
      this.baseURL = baseURL;
      this.apiKey = apiKey;
  }

  async post(endpoint, body, headers = {"Content-Type": "application/json"}) {
      if (this.apiKey) {
          headers["Authorization"] = `Bearer ${this.apiKey}`;
      }
      const url = `${this.baseURL}${endpoint}`;
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(body)
          });
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return await response.json();
      } catch (error) {
          console.error('Request Error:', error);
          throw error;
      }
  }

  async initiateSession(flowId, inputValue, stream = false, tweaks = {}) {
      const endpoint = `/api/v1/run/${flowId}?stream=${stream}`;
      return this.post(endpoint, { input_value: inputValue, tweaks: tweaks });
  }

  handleStream(streamUrl, onUpdate, onClose, onError) {
      const eventSource = new EventSource(streamUrl);

      eventSource.onmessage = event => {
          const data = JSON.parse(event.data);
          onUpdate(data);
      };

      eventSource.onerror = event => {
          console.error('Stream Error:', event);
          onError(event);
          eventSource.close();
      };

      eventSource.addEventListener("close", () => {
          onClose('Stream closed');
          eventSource.close();
      });

      return eventSource;
  }

  async runFlow(flowIdOrName, inputValue, tweaks, stream = false, onUpdate, onClose, onError) {
      try {
          const initResponse = await this.initiateSession(flowIdOrName, inputValue, stream, tweaks);
          console.log('Init Response:', initResponse);
          if (stream && initResponse && initResponse.outputs && initResponse.outputs[0].outputs[0].artifacts.stream_url) {
              const streamUrl = initResponse.outputs[0].outputs[0].artifacts.stream_url;
              console.log(`Streaming from: ${streamUrl}`);
              this.handleStream(streamUrl, onUpdate, onClose, onError);
          }
          return initResponse;
      } catch (error) {
          console.error('Error running flow:', error);
          onError('Error initiating session');
      }
  }
}

export default LangflowClient;
