// Token-efficient data formatting for AI consumption

import { EnhancedScrapedData, EnhancedYouTubeVideo } from './youtube-scraper-enhanced';

interface FormattedForAI {
  bike_name: string;
  source_summary: string;
  professional_reviews: string[];
  owner_experiences: string[];
  common_topics: Record<string, string[]>;
  transcript_insights: string[];
  comparison_notes: string[];
}

/**
 * Format enhanced YouTube data for AI consumption
 * Optimized for token efficiency while preserving quality
 */
export function formatEnhancedDataForAI(
  data: EnhancedScrapedData,
  comparisonVideos: EnhancedYouTubeVideo[] = []
): FormattedForAI {
  
  // Source summary
  const summary = `${data.summary.total_videos} videos analyzed (${data.summary.trusted_channel_videos} from trusted channels), ${data.summary.total_quality_comments} quality comments, ${data.summary.videos_with_transcripts} transcripts available. Top topics: ${data.summary.top_topics.join(', ')}`;
  
  // Professional reviews (from trusted channels)
  const professionalReviews = data.videos
    .filter(v => v.metadata.isTrustedChannel && v.transcript)
    .slice(0, 3)
    .map(v => {
      let review = `[${v.channelTitle}] ${v.title}\n`;
      if (v.transcript) {
        review += `Key points: ${v.transcript.substring(0, 500)}\n`;
      }
      if (v.transcriptKeyMoments.length > 0) {
        review += `Topics covered: ${v.transcriptKeyMoments.map(km => `${km.topic}: "${km.text}"`).join('; ')}`;
      }
      return review;
    });
  
  // Owner experiences (from comments)
  const ownerExperiences = data.videos
    .flatMap(v => v.comments.filter(c => c.contentType === 'experience'))
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 20)
    .map(c => `[${c.relevantTopics.join(', ')}] "${c.text}" - ${c.author} (${c.likeCount} likes)`);
  
  // Group comments by topic
  const topicComments: Record<string, string[]> = {};
  data.videos.forEach(v => {
    v.comments.forEach(c => {
      c.relevantTopics.forEach(topic => {
        if (!topicComments[topic]) topicComments[topic] = [];
        if (topicComments[topic].length < 5) {
          topicComments[topic].push(`"${c.text.substring(0, 150)}" - ${c.author}`);
        }
      });
    });
  });
  
  // Transcript insights (key moments from all videos)
  const transcriptInsights = data.videos
    .filter(v => v.transcriptKeyMoments.length > 0)
    .flatMap(v => v.transcriptKeyMoments.map(km => 
      `[${v.channelTitle}/${km.topic}] ${km.text}`
    ))
    .slice(0, 15);
  
  // Comparison notes
  const comparisonNotes = comparisonVideos
    .filter(v => v.transcript)
    .map(v => {
      let note = `[${v.channelTitle}] ${v.title}\n`;
      if (v.transcript) {
        note += `Summary: ${v.transcript.substring(0, 400)}`;
      }
      return note;
    });
  
  return {
    bike_name: data.bike_name,
    source_summary: summary,
    professional_reviews: professionalReviews,
    owner_experiences: ownerExperiences,
    common_topics: topicComments,
    transcript_insights: transcriptInsights,
    comparison_notes: comparisonNotes
  };
}

/**
 * Create final AI-ready payload
 */
export function createAIPayload(
  bike1Data: FormattedForAI,
  bike2Data: FormattedForAI
): string {
  return JSON.stringify({
    bike1: {
      name: bike1Data.bike_name,
      sources: bike1Data.source_summary,
      reviews: bike1Data.professional_reviews,
      experiences: bike1Data.owner_experiences,
      topics: bike1Data.common_topics,
      insights: bike1Data.transcript_insights
    },
    bike2: {
      name: bike2Data.bike_name,
      sources: bike2Data.source_summary,
      reviews: bike2Data.professional_reviews,
      experiences: bike2Data.owner_experiences,
      topics: bike2Data.common_topics,
      insights: bike2Data.transcript_insights
    },
    comparison: bike1Data.comparison_notes
  }, null, 2);
}

/**
 * Format for backwards compatibility with existing system
 */
export function formatForLegacySystem(data: EnhancedScrapedData): string {
  let output = `# YouTube Data for ${data.bike_name}\n\n`;
  output += `Total Videos: ${data.summary.total_videos}\n`;
  output += `Trusted Channel Videos: ${data.summary.trusted_channel_videos}\n`;
  output += `Videos with Transcripts: ${data.summary.videos_with_transcripts}\n`;
  output += `Total Quality Comments: ${data.summary.total_quality_comments}\n`;
  output += `Top Topics: ${data.summary.top_topics.join(', ')}\n\n`;
  output += `---\n\n`;
  
  data.videos.forEach((video, idx) => {
    output += `## Video ${idx + 1}: ${video.title}\n`;
    output += `Channel: ${video.channelTitle} (Trust Score: ${video.trustScore}/10)\n`;
    output += `Content Type: ${video.contentType}\n`;
    output += `Published: ${new Date(video.publishedAt).toLocaleDateString()}\n`;
    output += `Views: ${video.viewCount.toLocaleString()}\n`;
    output += `URL: https://www.youtube.com/watch?v=${video.videoId}\n\n`;
    
    // Add transcript if available
    if (video.transcript) {
      output += `**Transcript Summary:**\n${video.transcript}\n\n`;
      
      if (video.transcriptKeyMoments.length > 0) {
        output += `**Key Moments:**\n`;
        video.transcriptKeyMoments.forEach(km => {
          output += `- [${km.topic}]: ${km.text}\n`;
        });
        output += `\n`;
      }
    }
    
    // Add quality comments
    if (video.comments.length > 0) {
      output += `**Top Quality Comments (${video.comments.length}):**\n\n`;
      
      video.comments.forEach((comment, cidx) => {
        output += `${cidx + 1}. **${comment.author}** (${comment.likeCount} likes, Quality: ${Math.round(comment.qualityScore)}/100):\n`;
        output += `   Type: ${comment.contentType} | Topics: ${comment.relevantTopics.join(', ')}\n`;
        output += `   ${comment.text}\n\n`;
      });
    } else {
      output += `*No quality comments available*\n\n`;
    }
    
    output += `---\n\n`;
  });
  
  return output;
}

