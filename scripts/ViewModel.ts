 
import { TestPlaneModels } from "./TestPlaneModel"; 


export class ViewModel {

    constructor(TestPlanes: TestPlaneModels) {
        this._init();
    }
    private _init(): void {

        $(".container").remove();
        var canvas = $("<canvas />")
        //var ctx = document.getElementById('myChart').getContext('2d');
        $("body").append(canvas);
        // var x = new Chart(ctx, {
        //     // The type of chart we want to create
        //     type: 'line',
        
        //     // The data for our dataset
        //     data: {
        //         labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        //         datasets: [{
        //             label: 'My First dataset',
        //             backgroundColor: 'rgb(255, 99, 132)',
        //             borderColor: 'rgb(255, 99, 132)',
        //             data: [0, 10, 5, 2, 20, 30, 45]
        //         }]
        //     },        
        //     // Configuration options go here
        //     options: {}
        // }); 
    }
}