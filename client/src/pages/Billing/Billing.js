import React, { Component } from "react";
import { css } from "@emotion/core";
import { ClipLoader } from "react-spinners";
import Navbar from "../Navbar/Navbar";
import "./style.css";
import API from "../../utils/API";
import UnbilledProjectQueue from "../../components/UnbilledProjectQueue/UnbilledProjectQueue";
import BillList from "../../components/BillList/BillList";
import IssueRefundModal from "../../components/IssueRefundModal/IssueRefundModal";
import PaymentReceivedModal from "../../components/PaymentReceivedModal/PaymentReceivedModal";

var client = {
    contextID: localStorage.getItem("crafterClient")
};

const override = css`
  display: block;
  margin: 0 auto;
  border-color: indigo;
`;

class Billing extends Component {

    state = {
        bills: [],
        accountData: [],
        billsLoading: true,
        accountLoading: true,
        projectsLoading: true,
        inventoryLoading: true,
        customersLoading: true
    }


    handleFormUpdate = event => {
        const { name, value } = event.target;
        this.setState({
            [name]: value
        });
    }

    componentDidMount() {
        this.getAccountData();
        this.getBillData();
        this.getCompleteProjects();
        this.getInventory();
        this.getCustomers();
    }


    getAccountData = () => {
        API.getAccountData(client).then(res => this.setState({ accountData: res.data, accountLoading: false }))
    }

    getBillData = () => {
        API.getBillData(client).then(res => this.setState({ bills: res.data, billsLoading: false }));
    }

    getCompleteProjects = () => {
        API.getCompleteProjects(client).then(res => this.setState({ projects: res.data, projectsLoading: false }))
    }

    getInventory = () => {
        API.getInventory(client).then(res => this.setState({ inventory: res.data, inventoryLoading: false }))
    }

    getCustomers = () => {
        API.getCustomers(client).then(res => this.setState({ customers: res.data, customersLoading: false }))
    }

    generateBill = event => {
        event.preventDefault();

        var selectedProjectIndex = event.currentTarget.dataset.projectStateIndex;
        console.log(selectedProjectIndex);

        var selectedProjectInfo = this.state.projects[selectedProjectIndex];
        console.log(selectedProjectInfo);

        var billInfo = {
            contextID: client.contextID,
            created: new Date(),
            projectInfo: selectedProjectInfo,
            billedAmount: (selectedProjectInfo.totalHourlyFees + selectedProjectInfo.totalInventoryFees),
            revenueCollected: 0
        };

        var messageInfo = {
            text: "Good news, " + selectedProjectInfo.customer.firstName + ". Your project with " + this.state.accountData.businessName + " is complete. You will receive a bill shortly. Thank you for your business!",
            customerPhone: selectedProjectInfo.customer.phone
        }

        var markProjectBilledInfo = {
            projectID: selectedProjectInfo._id
        }

        API.createBill(billInfo)
            .then(res => console.log(res))
            .then(
                API.sendTwilioSMS(messageInfo).then(res => console.log(res))
            )
            .then(
                API.markProjectBilled(markProjectBilledInfo)
                    .then(res => console.log(res))
                    .then(document.location.reload(true))
            )

    }

    handlePaymentReceived = event => {
        event.preventDefault();
        var paymentReceivedBillIndex = event.currentTarget.dataset.billStateIndex;
        var paymentReceivedBillInfo = this.state.bills[paymentReceivedBillIndex];

        this.setState({
            paymentReceivedBillID: paymentReceivedBillInfo._id,
            paymentReceivedBillInfo: paymentReceivedBillInfo
        })
    }

    handleIssueRefund = event => {
        event.preventDefault();
        var refundedBillIndex = event.currentTarget.dataset.billStateIndex;
        var refundedBillInfo = this.state.bills[refundedBillIndex]

        this.setState({
            refundedBillID: refundedBillInfo._id,
            refundedBillInfo: refundedBillInfo
        })
    }

    handleIssueRefundSubmit = event => {
        event.preventDefault();

        var billInfo;
        var transactionInfo;

        if (this.state.refundAmount) {
            billInfo = {
                billID: this.state.refundedBillID,
                amount: (this.state.refundAmount * -1)
            }

            transactionInfo = {
                contextID: localStorage.getItem("crafterClient"),
                inventoryID: -1,
                projectID: this.state.refundedBillInfo.projectInfo._id,
                transactionDate: new Date(),
                transactionType: "bill_refund", //inventory_purchase or project_revenue
                transactionQuantity: 1,
                transactionUnitAmount: this.state.refundAmount,
                totalAmount: (this.state.refundAmount * -1),
            }
            API.billTransaction(billInfo).then(res => console.log(res))
            API.postTransaction(transactionInfo).then(res => console.log(res))
            //document.location.reload(true);
            this.getBillData();
        }
        else {
            alert("Sorry... form not complete.");
        }
    }

    handlePaymentReceivedSubmit = event => {
        event.preventDefault();

        var billInfo;
        var transactionInfo;

        if (this.state.paymentReceivedAmount) {
            billInfo = {
                billID: this.state.paymentReceivedBillID,
                amount: this.state.paymentReceivedAmount
            }

            transactionInfo = {
                contextID: localStorage.getItem("crafterClient"),
                inventoryID: -1,
                projectID: this.state.paymentReceivedBillInfo.projectInfo._id,
                transactionDate: new Date(),
                transactionType: "bill_payment", //inventory_purchase or project_revenue
                transactionQuantity: 1,
                transactionUnitAmount: this.state.paymentReceivedAmount,
                totalAmount: this.state.paymentReceivedAmount
            }

            API.billTransaction(billInfo).then(res => console.log(res))
            API.postTransaction(transactionInfo).then(res => console.log(res))
            //document.location.reload(true);
            this.getBillData();
        }
        else {
            alert("Sorry... form not complete.");
        }
    }

    showState = event => {
        event.preventDefault();

        console.log(this.state);

    }

    render() {
        return (
            <div>
                <Navbar />
                <div className="container pt-4">
                    <div className="col-md-12 my-5 mb-4 px-5 bg-white rounded content-container">
                        <div className="row text-center">
                            <div className="col-md-12">
                                <h2><strong>Billing</strong></h2>
                                <UnbilledProjectQueue
                                    projectData={this.state.projects}
                                    generateBill={this.generateBill}
                                />
                                <h3><strong>Existing Bills</strong></h3>
                                <ClipLoader
                                    css={override}
                                    size={150}
                                    //size={"150px"} this also works
                                    color={"#123abc"}
                                    loading={this.state.accountLoading || this.state.billsLoading || this.state.customersLoading ||
                                    this.state.inventoryLoading || this.state.projectsLoading}
                                />
                                {!this.state.accountLoading && !this.state.billsLoading && !this.state.customersLoading &&
                                    !this.state.inventoryLoading && !this.state.projectsLoading &&
                                    this.state.bills.map((bill, index) => (
                                        <BillList
                                            businessInfo={this.state.accountData}
                                            handleFormUpdate={this.handleFormUpdate}
                                            projectInfo={bill.projectInfo}
                                            handlePaymentReceived={this.handlePaymentReceived}
                                            handleIssueRefund={this.handleIssueRefund}
                                            billStateIndex={index}
                                            billInfo={this.state.bills[index]}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
                <IssueRefundModal
                    handleFormUpdate={this.handleFormUpdate}
                    handleIssueRefundSubmit={this.handleIssueRefundSubmit}
                    refundedBillInfo={this.state.refundedBillInfo}
                />
                <PaymentReceivedModal
                    handleFormUpdate={this.handleFormUpdate}
                    handlePaymentReceivedSubmit={this.handlePaymentReceivedSubmit}
                    paymentReceivedBillInfo={this.state.paymentReceivedBillInfo}
                />
            </div>
        )
    }

}

export default Billing;