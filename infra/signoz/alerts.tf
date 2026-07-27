locals {
  alerts = {
    ingestion_errors = {
      title       = "TemporalGuard ingestion errors"
      description = "Business-event ingestion errors were recorded."
      metric      = "temporalguard.event.ingestion.errors"
      operator    = "above"
      threshold   = 0
      severity    = "warning"
      window      = "5m"
    }
    queue_backlog = {
      title       = "TemporalGuard queue backlog"
      description = "Durable processing queue backlog is above the operating bound."
      metric      = "temporalguard.queue.backlog"
      operator    = "above"
      threshold   = 100
      severity    = "warning"
      window      = "10m"
    }
    deadline_drift = {
      title       = "TemporalGuard deadline drift"
      description = "Workflow deadline misses are being recorded."
      metric      = "temporalguard.workflows.overdue"
      operator    = "above"
      threshold   = 0
      severity    = "warning"
      window      = "15m"
    }
    violation_increase = {
      title       = "TemporalGuard violation increase"
      description = "Violation volume is above the configured operating threshold."
      metric      = "temporalguard.violations"
      operator    = "above"
      threshold   = 10
      severity    = "warning"
      window      = "15m"
    }
    no_completions = {
      title       = "TemporalGuard no completions"
      description = "No workflow completions were observed in the evaluation window."
      metric      = "temporalguard.workflows.completed"
      operator    = "below"
      threshold   = 1
      severity    = "critical"
      window      = "30m"
    }
    signoz_query_failure = {
      title       = "TemporalGuard SigNoz query failure"
      description = "Backend-only SigNoz evidence queries are failing."
      metric      = "temporalguard.signoz.query.failures"
      operator    = "above"
      threshold   = 0
      severity    = "warning"
      window      = "5m"
    }
    investigation_failure = {
      title       = "TemporalGuard investigation failure"
      description = "Investigation jobs exhausted retry or entered dead letter."
      metric      = "temporalguard.investigation.failures"
      operator    = "above"
      threshold   = 0
      severity    = "critical"
      window      = "10m"
    }
    telemetry_quality_regression = {
      title       = "TemporalGuard telemetry quality regression"
      description = "Telemetry completeness fell below the acceptable score."
      metric      = "temporalguard.telemetry.quality"
      operator    = "below"
      threshold   = 0.8
      severity    = "warning"
      window      = "15m"
    }
  }
}

resource "signoz_rule" "temporalguard" {
  for_each = local.alerts

  alert          = each.value.title
  alert_type     = "METRIC_BASED_ALERT"
  description    = each.value.description
  disabled       = true
  rule_type      = "threshold_rule"
  schema_version = "v2alpha1"

  annotations = {
    summary = each.value.description
  }

  condition = {
    composite_query = {
      query_type = "builder"
      panel_type = "graph"
      unit       = "none"
      queries = [{
        builder_query = {
          type = "builder_query"
          spec = {
            metrics = {
              name          = "A"
              signal        = "metrics"
              step_interval = "60"
              aggregations = [{
                metric_name       = each.value.metric
                time_aggregation  = "sum"
                space_aggregation = "sum"
              }]
              filter   = { expression = "" }
              group_by = []
              legend   = each.value.title
            }
          }
        }
      }]
    }
    selected_query_name = "A"
    thresholds = {
      basic = {
        kind = "basic"
        spec = [{
          name       = each.value.severity
          op         = each.value.operator
          match_type = "at_least_once"
          target     = each.value.threshold
          channels   = []
        }]
      }
    }
  }

  evaluation = {
    rolling = {
      kind = "rolling"
      spec = {
        eval_window = each.value.window
        frequency   = "1m"
      }
    }
  }

  labels = {
    managed_by = "terraform"
    product    = "temporalguard"
    severity   = each.value.severity
    team       = "platform"
  }

  notification_settings = {}
}
