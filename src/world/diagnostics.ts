export interface WorldIssue {code:string;subject:string;message:string;time:string}
export class WorldDiagnostics {
 private issues:WorldIssue[]=[];
 report(code:string,subject:string,error:unknown){const message=error instanceof Error?error.message:String(error);const issue={code,subject,message,time:new Date().toISOString()};this.issues.push(issue);this.issues=this.issues.slice(-30);console.warn(`[SpaceBar ${code}] ${subject}: ${message}`);return issue}
 snapshot():WorldIssue[]{return this.issues.map(issue=>({...issue}))}
}
