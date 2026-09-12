import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Info,
  Sliders,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';

export type HeatMapMetric = 'ALL_DIMENSIONS' | 'IV_ONLY' | 'SENTIMENT_ONLY' | 'OI_DENSITY';

interface StrikeHeatData {
  strike: number;
  isAtm: boolean;
  isItmCall: boolean;
  isItmPut: boolean;
  distanceFromSpot: number;
  callIv: number;
  putIv: number;
  avgIv: number;
  ivSkew: number; // Put IV - Call IV
  callOi: number;
  putOi: number;
  callChgOi: number;
  putChgOi: number;
  totalOi: number;
  pcr: number;
  sentimentScore: number; // -100 (extreme bearish) to +100 (extreme bullish)
  sentimentLabel: 'EXTREME_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'EXTREME_BEARISH';
  callLtp: number;
  putLtp: number;
  gammaRisk: number; // 0 to 100
  callBuildup: string;
  putBuildup: string;
}

export const VolatilityHeatMap: React.FC = () => {
  const {
    selectedInstrument,
    currentPrice,
    optionChain,
    executePaperTrade,
    injectMarketScenario,
  } = useTrading();

  const cfg = INSTRUMENTS[selectedInstrument];

  // Component state
  const [viewMode, setViewMode] = useState<HeatMapMetric>('ALL_DIMENSIONS');
  const [strikeRange, setStrikeRange] = useState<'NEAR' | 'EXPANDED'>('NEAR');
  const [hoveredData, setHoveredData] = useState<StrikeHeatData | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 480,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ResizeObserver for dynamic container responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions((prev) => ({
            ...prev,
            width: Math.max(320, width),
          }));
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute normalized heat map data for each strike
  const heatData: StrikeHeatData[] = useMemo(() => {
    if (!optionChain?.rows) return [];

    const rawRows = optionChain.rows;
    const filterDistance =
      strikeRange === 'NEAR' ? cfg.strikeStep * 7 : cfg.strikeStep * 14;

    const filtered = rawRows.filter(
      (r) => Math.abs(r.strikePrice - currentPrice) <= filterDistance
    );

    // Calculate max OI for normalization
    let maxTotalOi = 1;
    filtered.forEach((r) => {
      const tot = r.call.oi + r.put.oi;
      if (tot > maxTotalOi) maxTotalOi = tot;
    });

    return filtered.map((r) => {
      const diff = r.strikePrice - currentPrice;
      const callIv = r.call.iv;
      const putIv = r.put.iv;
      const avgIv = +((callIv + putIv) / 2).toFixed(2);
      const ivSkew = +(putIv - callIv).toFixed(2);
      const callOi = r.call.oi;
      const putOi = r.put.oi;
      const callChgOi = r.call.chgOi;
      const putChgOi = r.put.chgOi;
      const totalOi = callOi + putOi;
      const pcr = callOi > 0 ? +(putOi / callOi).toFixed(2) : 1;

      // Sentiment calculation:
      // Put Writing (high put OI & positive change) = Strong Bullish support
      // Call Writing (high call OI & positive change) = Strong Bearish resistance
      // Skew: High put IV reflects downside hedging; low put IV / high call IV reflects upside demand
      const oiRatio = (putOi - callOi) / (totalOi || 1); // -1 (all call) to +1 (all put)
      const chgRatio =
        ((putChgOi || 0) - (callChgOi || 0)) /
        (Math.abs(putChgOi || 0) + Math.abs(callChgOi || 0) + 5000);

      // Skew effect: Put skew > +1.5 means high protection demand (mild bearish fear)
      const skewImpact = -Math.max(-0.25, Math.min(0.25, (ivSkew - 0.5) * 0.1));

      const rawSentiment = (oiRatio * 0.55 + chgRatio * 0.35 + skewImpact * 0.1) * 100;
      const sentimentScore = Math.round(Math.max(-100, Math.min(100, rawSentiment)));

      let sentimentLabel: StrikeHeatData['sentimentLabel'] = 'NEUTRAL';
      if (sentimentScore >= 45) sentimentLabel = 'EXTREME_BULLISH';
      else if (sentimentScore >= 15) sentimentLabel = 'BULLISH';
      else if (sentimentScore <= -45) sentimentLabel = 'EXTREME_BEARISH';
      else if (sentimentScore <= -15) sentimentLabel = 'BEARISH';

      // Gamma Risk concentration (peaks at ATM with high total OI)
      const atmProximity = 1 / (1 + Math.abs(diff) / (cfg.strikeStep * 2));
      const oiFactor = totalOi / maxTotalOi;
      const gammaRisk = Math.round(atmProximity * 60 + oiFactor * 40);

      return {
        strike: r.strikePrice,
        isAtm: r.isAtm,
        isItmCall: r.isItmCall,
        isItmPut: r.isItmPut,
        distanceFromSpot: diff,
        callIv,
        putIv,
        avgIv,
        ivSkew,
        callOi,
        putOi,
        callChgOi,
        putChgOi,
        totalOi,
        pcr,
        sentimentScore,
        sentimentLabel,
        callLtp: r.call.ltp,
        putLtp: r.put.ltp,
        gammaRisk,
        callBuildup: r.call.buildup,
        putBuildup: r.put.buildup,
      };
    });
  }, [optionChain, currentPrice, cfg.strikeStep, strikeRange]);

  // Overall market summary stats derived from heat map
  const marketSummary = useMemo(() => {
    if (heatData.length === 0) {
      return {
        overallSentimentScore: 0,
        overallSentiment: 'NEUTRAL',
        avgIv: 14.5,
        avgSkew: 0.5,
        maxIvStrike: 0,
        maxIvVal: 0,
        supportStrike: 0,
        resistanceStrike: 0,
        maxGammaStrike: 0,
      };
    }

    let totalWeight = 0;
    let weightedSentiment = 0;
    let sumIv = 0;
    let sumSkew = 0;
    let maxIvVal = -Infinity;
    let maxIvStrike = heatData[0].strike;
    let maxPutOi = -1;
    let supportStrike = heatData[0].strike;
    let maxCallOi = -1;
    let resistanceStrike = heatData[0].strike;
    let maxGamma = -1;
    let maxGammaStrike = heatData[0].strike;

    heatData.forEach((d) => {
      const w = d.totalOi;
      totalWeight += w;
      weightedSentiment += d.sentimentScore * w;
      sumIv += d.avgIv;
      sumSkew += d.ivSkew;

      if (d.avgIv > maxIvVal) {
        maxIvVal = d.avgIv;
        maxIvStrike = d.strike;
      }
      if (d.putOi > maxPutOi) {
        maxPutOi = d.putOi;
        supportStrike = d.strike;
      }
      if (d.callOi > maxCallOi) {
        maxCallOi = d.callOi;
        resistanceStrike = d.strike;
      }
      if (d.gammaRisk > maxGamma) {
        maxGamma = d.gammaRisk;
        maxGammaStrike = d.strike;
      }
    });

    const overallSentimentScore = Math.round(
      weightedSentiment / (totalWeight || 1)
    );
    const avgIv = +(sumIv / heatData.length).toFixed(2);
    const avgSkew = +(sumSkew / heatData.length).toFixed(2);

    let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (overallSentimentScore >= 15) overallSentiment = 'BULLISH';
    else if (overallSentimentScore <= -15) overallSentiment = 'BEARISH';

    return {
      overallSentimentScore,
      overallSentiment,
      avgIv,
      avgSkew,
      maxIvStrike,
      maxIvVal,
      supportStrike,
      resistanceStrike,
      maxGammaStrike,
    };
  }, [heatData]);

  // D3 Rendering Hook
  useEffect(() => {
    if (!svgRef.current || heatData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const rowHeight = 32;
    const marginTop = 36;
    const marginBottom = 28;
    const marginLeft = 85;
    const marginRight = 20;

    const plotWidth = width - marginLeft - marginRight;
    const plotHeight = heatData.length * rowHeight;
    const totalHeight = marginTop + plotHeight + marginBottom;

    svg.attr('viewBox', `0 0 ${width} ${totalHeight}`);
    svg.attr('height', totalHeight);

    // Columns definitions based on ViewMode
    type ColumnDef = {
      id: string;
      labelBn: string;
      labelEn: string;
      flex: number;
      getValue: (d: StrikeHeatData) => number | string;
      getColor: (d: StrikeHeatData) => string;
      getTextColor: (d: StrikeHeatData) => string;
      format: (d: StrikeHeatData) => string;
    };

    // Global D3 Color Scales
    const minIv = d3.min(heatData, (d) => Math.min(d.callIv, d.putIv)) || 10;
    const maxIv = d3.max(heatData, (d) => Math.max(d.callIv, d.putIv)) || 25;

    // IV Sequential scale: Cool cyan (low IV) -> Golden Amber -> Bright Crimson/Rose (high IV)
    const ivColorScale = d3
      .scaleSequential(d3.interpolateViridis)
      .domain([minIv, maxIv]);

    // Sentiment Diverging: Red (-100) -> Dark Slate (0) -> Emerald (+100)
    const sentimentColorScale = (val: number) => {
      if (val > 0) {
        const t = Math.min(1, val / 100);
        return d3.interpolateRgb('#0f172a', '#10b981')(t * 0.85 + 0.15);
      } else {
        const t = Math.min(1, Math.abs(val) / 100);
        return d3.interpolateRgb('#0f172a', '#f43f5e')(t * 0.85 + 0.15);
      }
    };

    // Skew Diverging: Negative (Call premium/green) to Positive (Put premium/rose)
    const skewColorScale = (val: number) => {
      if (val > 0) {
        const t = Math.min(1, val / 2.5);
        return d3.interpolateRgb('#0f172a', '#e11d48')(t * 0.75 + 0.2);
      } else {
        const t = Math.min(1, Math.abs(val) / 2.5);
        return d3.interpolateRgb('#0f172a', '#06b6d4')(t * 0.75 + 0.2);
      }
    };

    const maxOiVal = d3.max(heatData, (d) => Math.max(d.callOi, d.putOi)) || 100000;
    const oiColorScale = (oi: number, type: 'CALL' | 'PUT') => {
      const t = Math.min(1, oi / maxOiVal);
      if (type === 'CALL') {
        return d3.interpolateRgb('#0f172a', '#e11d48')(t * 0.8 + 0.15);
      } else {
        return d3.interpolateRgb('#0f172a', '#10b981')(t * 0.8 + 0.15);
      }
    };

    let columns: ColumnDef[] = [];

    if (viewMode === 'ALL_DIMENSIONS') {
      columns = [
        {
          id: 'callIv',
          labelBn: 'কল IV',
          labelEn: 'Call IV',
          flex: 1,
          getValue: (d) => d.callIv,
          getColor: (d) => ivColorScale(d.callIv),
          getTextColor: () => '#f8fafc',
          format: (d) => `${d.callIv}%`,
        },
        {
          id: 'callOi',
          labelBn: 'কল OI ঘনত্ব',
          labelEn: 'CE Resistance',
          flex: 1.2,
          getValue: (d) => d.callOi,
          getColor: (d) => oiColorScale(d.callOi, 'CALL'),
          getTextColor: () => '#fecdd3',
          format: (d) => `${(d.callOi / 1000).toFixed(0)}k`,
        },
        {
          id: 'sentiment',
          labelBn: 'সেন্টিমেন্ট স্কোর',
          labelEn: 'Sentiment',
          flex: 1.5,
          getValue: (d) => d.sentimentScore,
          getColor: (d) => sentimentColorScale(d.sentimentScore),
          getTextColor: (d) => (d.sentimentScore >= 0 ? '#6ee7b7' : '#fda4af'),
          format: (d) => `${d.sentimentScore > 0 ? '+' : ''}${d.sentimentScore}%`,
        },
        {
          id: 'putOi',
          labelBn: 'পুট OI ঘনত্ব',
          labelEn: 'PE Support',
          flex: 1.2,
          getValue: (d) => d.putOi,
          getColor: (d) => oiColorScale(d.putOi, 'PUT'),
          getTextColor: () => '#a7f3d0',
          format: (d) => `${(d.putOi / 1000).toFixed(0)}k`,
        },
        {
          id: 'putIv',
          labelBn: 'পুট IV',
          labelEn: 'Put IV',
          flex: 1,
          getValue: (d) => d.putIv,
          getColor: (d) => ivColorScale(d.putIv),
          getTextColor: () => '#f8fafc',
          format: (d) => `${d.putIv}%`,
        },
        {
          id: 'skew',
          labelBn: 'IV স্কিউ',
          labelEn: 'IV Skew',
          flex: 1,
          getValue: (d) => d.ivSkew,
          getColor: (d) => skewColorScale(d.ivSkew),
          getTextColor: (d) => (d.ivSkew >= 0 ? '#fda4af' : '#67e8f9'),
          format: (d) => `${d.ivSkew > 0 ? '+' : ''}${d.ivSkew}%`,
        },
      ];
    } else if (viewMode === 'IV_ONLY') {
      columns = [
        {
          id: 'callIv',
          labelBn: 'কল ইমপ্লাইড ভলাট্যালিটি',
          labelEn: 'Call IV %',
          flex: 1.5,
          getValue: (d) => d.callIv,
          getColor: (d) => ivColorScale(d.callIv),
          getTextColor: () => '#f8fafc',
          format: (d) => `${d.callIv}% IV`,
        },
        {
          id: 'avgIv',
          labelBn: 'গড় ভলাট্যালিটি (Mean IV)',
          labelEn: 'Average IV %',
          flex: 1.8,
          getValue: (d) => d.avgIv,
          getColor: (d) => ivColorScale(d.avgIv),
          getTextColor: () => '#f8fafc',
          format: (d) => `${d.avgIv}%`,
        },
        {
          id: 'putIv',
          labelBn: 'পুট ইমপ্লাইড ভলাট্যালিটি',
          labelEn: 'Put IV %',
          flex: 1.5,
          getValue: (d) => d.putIv,
          getColor: (d) => ivColorScale(d.putIv),
          getTextColor: () => '#f8fafc',
          format: (d) => `${d.putIv}% IV`,
        },
        {
          id: 'skew',
          labelBn: 'ভলাট্যালিটি স্কিউ (Put - Call)',
          labelEn: 'IV Skew Spread',
          flex: 1.4,
          getValue: (d) => d.ivSkew,
          getColor: (d) => skewColorScale(d.ivSkew),
          getTextColor: (d) => (d.ivSkew >= 0 ? '#fda4af' : '#67e8f9'),
          format: (d) => `${d.ivSkew > 0 ? '+' : ''}${d.ivSkew}%`,
        },
      ];
    } else if (viewMode === 'SENTIMENT_ONLY') {
      columns = [
        {
          id: 'pcr',
          labelBn: 'স্ট্রাইক PCR',
          labelEn: 'Strike PCR',
          flex: 1,
          getValue: (d) => d.pcr,
          getColor: (d) => sentimentColorScale((d.pcr - 1) * 70),
          getTextColor: (d) => (d.pcr >= 1 ? '#6ee7b7' : '#fda4af'),
          format: (d) => `${d.pcr}`,
        },
        {
          id: 'sentimentScore',
          labelBn: 'সেন্টিমেন্ট ঘনত্ব স্কোর',
          labelEn: 'Sentiment Concentration',
          flex: 2.2,
          getValue: (d) => d.sentimentScore,
          getColor: (d) => sentimentColorScale(d.sentimentScore),
          getTextColor: () => '#ffffff',
          format: (d) =>
            `${d.sentimentScore > 0 ? '▲ +' : '▼ '}${d.sentimentScore}% (${
              d.sentimentScore >= 20
                ? 'বুলিশ'
                : d.sentimentScore <= -20
                ? 'বেয়ারিশ'
                : 'নিউট্রাল'
            })`,
        },
        {
          id: 'gammaRisk',
          labelBn: 'গ্যামা এক্সপোজার রিস্ক',
          labelEn: 'Gamma Magnet Risk',
          flex: 1.4,
          getValue: (d) => d.gammaRisk,
          getColor: (d) =>
            d3.interpolateViridis(Math.min(1, d.gammaRisk / 100)),
          getTextColor: () => '#ffffff',
          format: (d) => `${d.gammaRisk}/100`,
        },
      ];
    } else {
      // OI_DENSITY
      columns = [
        {
          id: 'callOi',
          labelBn: 'কল ওপেন ইন্টারেস্ট (রেজিস্ট্যান্স)',
          labelEn: 'Call OI (Resistance)',
          flex: 1.6,
          getValue: (d) => d.callOi,
          getColor: (d) => oiColorScale(d.callOi, 'CALL'),
          getTextColor: () => '#fecdd3',
          format: (d) => `${(d.callOi / 1000).toFixed(0)}k (${d.callBuildup})`,
        },
        {
          id: 'totalOi',
          labelBn: 'মোট OI ঘনত্ব',
          labelEn: 'Total Concentration',
          flex: 1.4,
          getValue: (d) => d.totalOi,
          getColor: (d) =>
            d3.interpolateBlues(Math.min(1, d.totalOi / (maxOiVal * 1.8))),
          getTextColor: () => '#e0f2fe',
          format: (d) => `${(d.totalOi / 1000).toFixed(0)}k`,
        },
        {
          id: 'putOi',
          labelBn: 'পুট ওপেন ইন্টারেস্ট (সাপোর্ট)',
          labelEn: 'Put OI (Support)',
          flex: 1.6,
          getValue: (d) => d.putOi,
          getColor: (d) => oiColorScale(d.putOi, 'PUT'),
          getTextColor: () => '#a7f3d0',
          format: (d) => `${(d.putOi / 1000).toFixed(0)}k (${d.putBuildup})`,
        },
      ];
    }

    // Compute column pixel widths
    const totalFlex = columns.reduce((sum, col) => sum + col.flex, 0);
    let currentX = marginLeft;
    const colLayouts = columns.map((col) => {
      const colWidth = (col.flex / totalFlex) * plotWidth;
      const layout = { ...col, x: currentX, width: colWidth };
      currentX += colWidth;
      return layout;
    });

    // Main Chart Container G
    const g = svg.append('g');

    // Column Headers
    const headerG = g.append('g').attr('class', 'headers');

    // Strike header
    headerG
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', marginLeft - 8)
      .attr('height', marginTop - 8)
      .attr('fill', '#090d16')
      .attr('rx', 4);

    headerG
      .append('text')
      .attr('x', (marginLeft - 8) / 2)
      .attr('y', marginTop / 2 - 2)
      .attr('fill', '#94a3b8')
      .attr('font-size', '11')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .text('স্ট্রাইক');

    colLayouts.forEach((col) => {
      const colH = headerG.append('g');

      colH
        .append('rect')
        .attr('x', col.x + 2)
        .attr('y', 0)
        .attr('width', col.width - 4)
        .attr('height', marginTop - 8)
        .attr('fill', '#0f172a')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.8)
        .attr('rx', 4);

      colH
        .append('text')
        .attr('x', col.x + col.width / 2)
        .attr('y', marginTop / 2 - 5)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '10.5')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .text(col.labelBn);

      colH
        .append('text')
        .attr('x', col.x + col.width / 2)
        .attr('y', marginTop / 2 + 7)
        .attr('fill', '#64748b')
        .attr('font-size', '9')
        .attr('font-family', 'monospace')
        .attr('text-anchor', 'middle')
        .text(col.labelEn);
    });

    // Rows Rendering
    heatData.forEach((row, rowIdx) => {
      const rowY = marginTop + rowIdx * rowHeight;
      const rowG = g
        .append('g')
        .attr('class', `row-${row.strike}`)
        .style('cursor', 'pointer');

      const isAtm = row.isAtm;
      const isSelected = selectedStrike === row.strike;

      // Strike label button on the left
      const strikeBtn = rowG.append('g');

      strikeBtn
        .append('rect')
        .attr('x', 0)
        .attr('y', rowY + 1)
        .attr('width', marginLeft - 8)
        .attr('height', rowHeight - 2)
        .attr('fill', isSelected ? '#0369a1' : isAtm ? '#1e293b' : '#090d16')
        .attr('stroke', isAtm ? '#38bdf8' : isSelected ? '#38bdf8' : '#1e293b')
        .attr('stroke-width', isAtm || isSelected ? 1.5 : 0.8)
        .attr('rx', 4);

      // ATM Badge indicator
      if (isAtm) {
        strikeBtn
          .append('circle')
          .attr('cx', 12)
          .attr('cy', rowY + rowHeight / 2)
          .attr('r', 3)
          .attr('fill', '#38bdf8');
      }

      strikeBtn
        .append('text')
        .attr('x', isAtm ? 48 : (marginLeft - 8) / 2)
        .attr('y', rowY + rowHeight / 2 + 3.5)
        .attr('fill', isAtm ? '#38bdf8' : '#e2e8f0')
        .attr('font-size', '11')
        .attr('font-family', 'monospace')
        .attr('font-weight', isAtm ? '900' : '600')
        .attr('text-anchor', 'middle')
        .text(row.strike);

      // Cells in this row
      colLayouts.forEach((col) => {
        const cellX = col.x + 2;
        const cellW = col.width - 4;
        const cellY = rowY + 1;
        const cellH = rowHeight - 2;

        const cellColor = col.getColor(row);
        const textColor = col.getTextColor(row);
        const textVal = col.format(row);

        const cellG = rowG.append('g');

        // Cell rect
        cellG
          .append('rect')
          .attr('x', cellX)
          .attr('y', cellY)
          .attr('width', cellW)
          .attr('height', cellH)
          .attr('fill', cellColor)
          .attr('rx', 3.5)
          .attr('stroke', isAtm ? '#38bdf8' : isSelected ? '#0284c7' : '#1e293b')
          .attr('stroke-width', isAtm ? 1 : isSelected ? 1.2 : 0.5)
          .attr('stroke-opacity', isAtm ? 0.6 : 0.4)
          .style('transition', 'all 0.15s ease');

        // Text value inside cell
        cellG
          .append('text')
          .attr('x', cellX + cellW / 2)
          .attr('y', cellY + cellH / 2 + 3.5)
          .attr('fill', textColor)
          .attr('font-size', '10')
          .attr('font-family', 'monospace')
          .attr('font-weight', isAtm ? 'bold' : '500')
          .attr('text-anchor', 'middle')
          .text(textVal);
      });

      // Mouse interactivity for hover tooltip & click
      rowG
        .on('mouseenter', (event) => {
          setHoveredData(row);
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setHoverPos({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            });
          }
        })
        .on('mousemove', (event) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setHoverPos({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            });
          }
        })
        .on('mouseleave', () => {
          setHoveredData(null);
          setHoverPos(null);
        })
        .on('click', () => {
          setSelectedStrike(row.strike);
        });
    });

    // Spot Price Horizontal Line across the matrix
    const atmIdx = heatData.findIndex((d) => d.isAtm);
    if (atmIdx >= 0) {
      const spotY = marginTop + atmIdx * rowHeight + rowHeight / 2;
      const spotG = g.append('g').attr('class', 'spot-overlay');

      spotG
        .append('line')
        .attr('x1', marginLeft)
        .attr('y1', spotY)
        .attr('x2', width - marginRight)
        .attr('y2', spotY)
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5 3')
        .attr('opacity', 0.85);
    }
  }, [heatData, viewMode, dimensions, selectedStrike]);

  const handleQuickTradeStrike = (type: 'CALL' | 'PUT') => {
    if (!hoveredData && !selectedStrike) return;
    const targetRow = hoveredData || heatData.find((d) => d.strike === selectedStrike);
    if (!targetRow) return;

    const isCall = type === 'CALL';
    const ltp = isCall ? targetRow.callLtp : targetRow.putLtp;

    const ok = executePaperTrade({
      type,
      strikePrice: targetRow.strike,
      entryPrice: ltp,
      stopLoss: +(ltp * 0.72).toFixed(1),
      target: +(ltp * 1.55).toFixed(1),
      quantity: cfg.lotSize * 2,
      symbol: `${cfg.symbol} ${targetRow.strike} ${isCall ? 'CE' : 'PE'}`,
    });

    if (ok) {
      showToast(
        `হিটম্যাপ থেকে সরাসরি ${cfg.symbol} ${targetRow.strike} ${
          isCall ? 'CE' : 'PE'
        } পেপার ট্রেড ওপেন হয়েছে!`
      );
    }
  };

  return (
    <div
      id="volatility-heat-map-panel"
      ref={containerRef}
      className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl space-y-4 relative"
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-2 right-4 z-30 bg-cyan-400 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-2 shadow-2xl animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">
                ভলাট্যালিটি ও মার্কেট সেন্টিমেন্ট কনসেন্ট্রেশন হিটম্যাপ
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                D3.js ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              স্ট্রাইকভিত্তিক ইমপ্লাইড ভলাট্যালিটি (IV Smile), পুট-কল সেন্টিমেন্ট ঘনত্ব এবং গ্যামা ক্লাস্টার
            </p>
          </div>
        </div>

        {/* Spot & Summary Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-500 block">লাইভ স্পট প্রাইস</span>
            <span className="font-mono font-bold text-cyan-300">
              {cfg.currency}{currentPrice.toFixed(1)}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-500 block">সামগ্রিক সেন্টিমেন্ট</span>
            <span
              className={`font-mono font-bold ${
                marketSummary.overallSentiment === 'BULLISH'
                  ? 'text-emerald-400'
                  : marketSummary.overallSentiment === 'BEARISH'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {marketSummary.overallSentimentScore > 0 ? '+' : ''}
              {marketSummary.overallSentimentScore}% ({marketSummary.overallSentiment})
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Avg Implied Volatility */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>গড় ইমপ্লাইড ভলাট্যালিটি</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {marketSummary.avgIv}%
          </div>
          <span className="text-[10px] text-slate-500">
            India VIX: 13.85 • {marketSummary.avgIv > 16 ? 'উচ্চ অস্থিরতা' : 'স্বাভাবিক রেঞ্জ'}
          </span>
        </div>

        {/* Metric 2: Volatility Skew (Fear vs Greed) */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>IV স্কিউ (Put - Call)</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              marketSummary.avgSkew > 0 ? 'text-rose-400' : 'text-cyan-400'
            }`}
          >
            {marketSummary.avgSkew > 0 ? '+' : ''}{marketSummary.avgSkew}%
          </div>
          <span className="text-[10px] text-slate-500">
            {marketSummary.avgSkew > 0.8
              ? 'ডাউনসাইড হেজিং ডিমান্ড (পুট প্রিমিয়াম)'
              : 'আপসাইড কল মোমেন্টাম'}
          </span>
        </div>

        {/* Metric 3: Key Support Concentration */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>মেজর সাপোর্ট কনসেন্ট্রেশন</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-1">
            {marketSummary.supportStrike} PE
          </div>
          <span className="text-[10px] text-emerald-500/80">
            সর্বোচ্চ পুট রাইটিং ক্লাস্টার
          </span>
        </div>

        {/* Metric 4: Key Resistance Wall */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>মেজর রেজিস্ট্যান্স ওয়াল</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-base font-bold font-mono text-rose-400 mt-1">
            {marketSummary.resistanceStrike} CE
          </div>
          <span className="text-[10px] text-rose-500/80">
            সর্বোচ্চ কল রাইটিং ক্লাস্টার
          </span>
        </div>
      </div>

      {/* Heatmap Controls: Dimension Switcher & Range */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
        {/* View Mode Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            id="btn-heatmap-mode-all"
            onClick={() => setViewMode('ALL_DIMENSIONS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === 'ALL_DIMENSIONS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            সার্বিক ম্যাট্রিক্স (All Dimensions)
          </button>

          <button
            id="btn-heatmap-mode-iv"
            onClick={() => setViewMode('IV_ONLY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === 'IV_ONLY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ইমপ্লাইড ভলাট্যালিটি (IV Smile)
          </button>

          <button
            id="btn-heatmap-mode-sentiment"
            onClick={() => setViewMode('SENTIMENT_ONLY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === 'SENTIMENT_ONLY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            সেন্টিমেন্ট ঘনত্ব ও গ্যামা
          </button>

          <button
            id="btn-heatmap-mode-oi"
            onClick={() => setViewMode('OI_DENSITY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === 'OI_DENSITY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ওপেন ইন্টারেস্ট (OI) হিট
          </button>
        </div>

        {/* Strike Range Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px]">রেঞ্জ:</span>
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setStrikeRange('NEAR')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition ${
                strikeRange === 'NEAR'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ATM ±৭
            </button>
            <button
              onClick={() => setStrikeRange('EXPANDED')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition ${
                strikeRange === 'EXPANDED'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ATM ±১৪
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] px-1 text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">সেন্টিমেন্ট স্কেল:</span>
            <div className="flex items-center gap-0.5">
              <span className="w-3.5 h-3 rounded-sm bg-rose-600 inline-block"></span>
              <span className="text-[10px] font-mono text-rose-300">-100% (বেয়ারিশ)</span>
              <span className="w-3 h-3 rounded-sm bg-slate-800 inline-block ml-1"></span>
              <span className="text-[10px] font-mono text-slate-400">০ (নিউট্রাল)</span>
              <span className="w-3.5 h-3 rounded-sm bg-emerald-600 inline-block ml-1"></span>
              <span className="text-[10px] font-mono text-emerald-300">+100% (বুলিশ)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">IV হিট লেভেল:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-[#440154] inline-block"></span>
              <span className="text-[10px] text-slate-400">কম IV</span>
              <span className="w-3 h-3 rounded-sm bg-[#21918c] inline-block"></span>
              <span className="text-[10px] text-slate-400">মাঝারি</span>
              <span className="w-3 h-3 rounded-sm bg-[#fde725] inline-block"></span>
              <span className="text-[10px] text-amber-300">তীব্র অস্থিরতা</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>নীল ড্যাশ লাইন = লাইভ এটিএম (ATM) স্পট</span>
        </div>
      </div>

      {/* D3 SVG Canvas Container */}
      <div className="relative overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950 p-2">
        <svg
          ref={svgRef}
          className="w-full min-w-[580px] select-none block"
          style={{ maxHeight: '560px' }}
        />

        {/* Dynamic D3 Interactive Floating Hover Tooltip */}
        {hoveredData && hoverPos && (
          <div
            className="absolute z-20 pointer-events-none rounded-xl border border-cyan-500/50 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-75 space-y-2 w-72"
            style={{
              left: Math.min(hoverPos.x + 15, dimensions.width - 300),
              top: Math.max(10, hoverPos.y - 120),
            }}
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-sm text-cyan-300">
                  স্ট্রাইক: {hoveredData.strike}
                </span>
                {hoveredData.isAtm && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    ATM
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                স্পট থেকে: {hoveredData.distanceFromSpot > 0 ? '+' : ''}
                {hoveredData.distanceFromSpot.toFixed(0)}
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">কল IV / প্রিমিয়াম</span>
                <span className="text-slate-100 font-bold">
                  {hoveredData.callIv}% (₹{hoveredData.callLtp})
                </span>
              </div>

              <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">পুট IV / প্রিমিয়াম</span>
                <span className="text-slate-100 font-bold">
                  {hoveredData.putIv}% (₹{hoveredData.putLtp})
                </span>
              </div>

              <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">সেন্টিমেন্ট স্কোর</span>
                <span
                  className={`font-bold ${
                    hoveredData.sentimentScore >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {hoveredData.sentimentScore > 0 ? '+' : ''}
                  {hoveredData.sentimentScore}%
                </span>
              </div>

              <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">স্ট্রাইক PCR</span>
                <span className="text-cyan-300 font-bold">{hoveredData.pcr}</span>
              </div>
            </div>

            {/* Action / Institutional Signal */}
            <div className="text-[10px] text-slate-300 bg-slate-900 p-1.5 rounded border border-slate-800/80">
              <span className="text-slate-500 block">ইনস্টিটিউশনাল অ্যাকশন:</span>
              <span className="font-semibold text-cyan-200">
                {hoveredData.sentimentScore >= 35
                  ? 'হেভি পুট রাইটিং — স্ট্রং সাপোর্ট জোন'
                  : hoveredData.sentimentScore <= -35
                  ? 'হেভি কল রাইটিং — রেজিস্ট্যান্স ওয়াল'
                  : 'ব্যালেন্সড পার্টিসিপেশন ও রেঞ্জবাউন্ড'}
              </span>
            </div>

            <div className="text-[10px] text-slate-400 text-center font-mono">
              ক্লিক করে পেপার ট্রেড অপশন নির্বাচন করুন
            </div>
          </div>
        )}
      </div>

      {/* Interactive Quick Trade Banner when a strike is clicked or selected */}
      {selectedStrike && (
        <div className="rounded-xl border border-cyan-500/40 bg-slate-950 p-3 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <div>
              <span className="text-xs font-bold text-slate-100">
                নির্বাচিত স্ট্রাইক: <strong className="font-mono text-cyan-300">{selectedStrike}</strong>
              </span>
              <p className="text-[11px] text-slate-400">
                সরাসরি এই স্ট্রাইকে পেপার ট্রেড এক্সিকিউট করতে কল বা পুট নির্বাচন করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuickTradeStrike('CALL')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition active:scale-95"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY {selectedStrike} CALL (CE)</span>
            </button>

            <button
              onClick={() => handleQuickTradeStrike('PUT')}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition active:scale-95"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>BUY {selectedStrike} PUT (PE)</span>
            </button>

            <button
              onClick={() => setSelectedStrike(null)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
