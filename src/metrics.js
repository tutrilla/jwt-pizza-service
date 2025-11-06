const os = require('os');
const config = require('./config');

class OtelMetricBuilder {
    constructor() {
        this.metrics = [];
    }

    add(metricObject) {
        if (!metricObject) {
            return;
        }

        if (typeof metricObject.getMetrics === 'function') {
            const metrics = metricObject.getMetrics();
            this.metrics.push(metrics);
        }

        else {
            this.metrics.push(metricObject);
        }

        return this;
    }

    sendToGrafana() {
        this.metrics.forEach(metricGroup => {
            for (const [key, value] of Object.entries(metricGroup)) {
                const metricConfig = this.getMetricConfig(key);
                sendMetricToGrafana(
                    metricConfig.name,
                    value,
                    metricConfig.type,
                    metricConfig.unit
                );
            }
        });
    }

    getMetricConfig(key) {
        const configs = {
            // HTTP Metrics
            'total': { name: 'http_requests_total', type: 'sum', unit: 'requests' },
            'GET': { name: 'http_requests_get', type: 'sum', unit: 'requests' },
            'PUT': { name: 'http_requests_put', type: 'sum', unit: 'requests' },
            'POST': { name: 'http_requests_post', type: 'sum', unit: 'requests' },
            'DELETE': { name: 'http_requests_delete', type: 'sum', unit: 'requests' },

            // System metrics
            'cpuUsage': { name: 'system_cpu_usage', type: 'gauge', unit: 'percent' },
            'memoryUsage': { name: 'system_memory_usage', type: 'gauge', unit: 'percent' },
        };

        return configs[key] || { name: key, type: 'gauge', unit: 'value' };
    }

}

class HttpMetrics {
    constructor() {
        this.requests = {
            total: 0,
            GET: 0,
            PUT: 0,
            POST: 0,
            DELETE: 0
        };
    }

    incrementRequest(method) {
        this.requests.total++;
        if (this.requests[method] !== undefined) {
            this.requests[method]++;
        }
    }

    getMetrics() {
        return { ...this.requests };
    }

    reset() {
        this.requests = {
            total:0,
            GET: 0,
            PUT: 0,
            POST: 0,
            DELETE: 0
        };
    }
}

class SystemMetrics {
    getMetrics() {
        return {
            cpuUsage: getCpuUsagePercentage(),
            memoryUsage: getMemoryUsagePercentage()
        };
    }
}

class UserMetrics {
    constructor() {
        this.activeUsers = 0;
    }

    getMetrics() {
        return { activeUsers: this.activeUsers };
    }
}

class AuthMetrics {
    constructor() {
    }

    getMetrics() {
        return;
    }
}

class PurchaseMetrics {
    constructor() {

    }

    getMetrics() {
        return;
    }
}

const httpMetrics = new HttpMetrics();
const systemMetrics = new SystemMetrics();

function sendMetricToGrafana(metricName, metricValue, type, unit) {
  const metric = {
    resourceMetrics: [
      {
        resource: {
            attributes: [
                {
                    key: 'service.name',
                    value: { stringValue: config.metrics.source }
                }
            ]
        },
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [
                    {
                      [type === 'gauge' ? 'asDouble' : 'asInt']: type === 'gauge' ? parseFloat(metricValue) : metricValue,
                      timeUnixNano: Date.now() * 1000000,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  if (type === 'sum') {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
  }

  const body = JSON.stringify(metric);
  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: body,
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
        });
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

function sendMetricsPeriodically(period) {
  const timer = setInterval(() => {
    try {
      const metrics = new OtelMetricBuilder();
      metrics.add(httpMetrics);
      metrics.add(systemMetrics);
      // metrics.add(userMetrics);
      // metrics.add(purchaseMetrics);
      // metrics.add(authMetrics);

      metrics.sendToGrafana();
    } catch (error) {
      console.log('Error sending metrics', error);
    }
  }, period);

  return timer;
}

function requestTracker(req, res, next) {
    httpMetrics.incrementRequest(req.method);
    next();
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

module.exports = {
    requestTracker,
    sendMetricsPeriodically
}