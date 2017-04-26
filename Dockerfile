FROM kibana:5.3.0

RUN kibana-plugin install https://github.com/theRealWardo/logwhale/releases/download/0.0.1/logwhale-0.0.1.zip
